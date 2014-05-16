var tasker = angular.module("tasker", ["restangular", "ngRoute",
	"ngTable", "ngSanitize", "angularMoment"]);

tasker.factory("joinFilter", function() {
	return function(input, char) {
		var input = input || [];
		var char = char || "";

		return input.join(char);
	};
});

tasker.factory("mdFilter", function() {
	var converter = new Showdown.converter();
	return function(input) {
		return converter.makeHtml(input || "");
    };
});

tasker.factory("tasks", function(Restangular) {
	return Restangular.withConfig(function(RestangularConfigurer) {
		var url = window.location.origin + "/tasker/"
		RestangularConfigurer.setBaseUrl(url);
		RestangularConfigurer.setRequestSuffix("/");
	});
});

tasker.factory("mngtable", function($filter, ngTableParams) {
	return {
		make: function($scope, subfilter, varname) {
			return new ngTableParams({
				page: 1,
				count: 100,
				sorting: {
					floor: "asc",
					room: "asc",
					name: "asc",
				},
			}, {
				filterDelay: 100,
				total: 0,
				getData: function($defer, params) {
					var data = varname ? $scope[varname] : $scope.data;

					if (params.filter())
						data = $filter("filter")(data, params.filter());
					if (subfilter)
						data = subfilter(data);
					if (params.sorting())
						data = $filter("orderBy")(data, params.orderBy());
					params.total(data.length);
					$defer.resolve(data);
				},
			});
		},
	};
});

tasker.controller("main", function($scope, mngtable, tasks)  {
	$scope.data = [];
	$scope.active = "list";
	$scope.mngtable = mngtable.make($scope);
	$scope.pending_line = false;

	$scope.add_line = function() {
		blank_task = {
			floor: "",
			room: "",
			name: "",
			price: 0,

			dirty: true,
			edit: true,
		};
		$scope.data.push(blank_task);
		$scope.mngtable.reload();
	};

	$scope.save = function(task) {
		var task_load = function(task) {
			task.dirty = false;
			task.edit = false;
			$scope.mngtable.reload();
		};

		if ("id" in task) {
			task.put().then(function() {
				task_load(task);
			}, function() {
				console.log("error while task puting");
			});
		} else {
			tasks.all("task").post(task).then(function() {
				task_load(task);
			}, function() {
				console.log("error while posting");
			});
		};
	};

	$scope.del = function(task) {
		task.remove().then(function() {
			var index = $scope.data.indexOf(task);
			if (index == -1) {
				console.log("can't remove, not found");
			} else {
				$scope.data.splice(index, 1);
			};
			$scope.mngtable.reload();
		}, function() {
			console.log("error while removing task");
		});
	};

	tasks.all("task").getList().then(function(collection) {
		_.each(collection, function(item) {
			item.dirty = false;
			item.edit = false;
		});

		$scope.data = collection;
		$scope.mngtable.reload();
	});
});
