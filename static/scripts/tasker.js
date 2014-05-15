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

tasker.controller("tasker-ctrl", function($scope, mngtable, tasks)  {
	$scope.data = [];
	$scope.active = "list";
	$scope.mngtable = mngtable.make();

	cnc.all("task").getList().then(function(collection) {
		$scope.data = collection;
		$scope.mngtable.reload();
	});
});
