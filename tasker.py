# Copyright (c) 2014 steak - All rights reserved

import config
import peewee
from functools import wraps
from json import loads, dumps
from flask import Flask, Response, request, abort
from logging import DEBUG, StreamHandler
from playhouse.proxy import Proxy


app = Flask(__name__)


@app.before_first_request
def setup_logging():
    app.logger.addHandler(StreamHandler())
    app.logger.setLevel(DEBUG)


# this decorator's goal is to replace the conventionnal @app.route("bla")
# it perform automagicly the serialization in json and set the correct mime
def route(path, **options):
    def outer_wrap(f):
        @wraps(f)
        def inner_wrap(*args, **kwargs):
            r = f(*args, **kwargs)
            return Response(dumps(r), content_type="application/json")
        endpoint = options.pop('endpoint', None)
        app.add_url_rule(path, endpoint, inner_wrap, **options)
    return outer_wrap


@route("/")
def index():
    return "Tasker v-" + config.version

db = Proxy()
db.initialize(peewee.SqliteDatabase(config.database_name,
                                    threadlocals=True))
# 4 view: list
#         dependency graph
#         timeline
#         todo per personns
class HouseTask(peewee.Model):
    floor = peewee.TextField(default="RC")
    room = peewee.TextField(default="None")
    name = peewee.TextField(default="")
    price = peewee.IntegerField(default=0)
    start_date = peewee.DateTimeField(default=None, null=True)
    duration = peewee.IntegerField(default=1)
    valid = peewee.BooleanField(default=False)
    description = peewee.TextField(default="")
    s_actions = peewee.TextField(default="")
    dependencies = peewee.TextField(default="")

    class Meta:
        database = db    


    def __str__(self):
        return "Task #%d" % self.id


    @property
    def actions(self):
        return loads(self.s_actions)

    @actions.setter
    def actions(self, value):
        self.s_actions = dumps(value)


    def json(self):
        return {"floor": self.floor,
                "room": self.room,
                "name": self.name,
                "price": self.price,
                "start_date": self.start_date.strftime("%Y-%m-%d %H:%M:%S"),
                "duration": self.duration,
                "valid": self.valid,
                "description": self.description,
                "actions": self.actions,
                "dependencies": self.dependencies}


def db_init():
    HouseTask.create_table()


@route("/task/")
def get_all_task():
    return [ task.json() for task in HouseTask.select() ]


@route("/task/<int:id>/")
def get_one_task(id):
    return HouseTask.select().where(HouseTask.id==id).get().json()


def run_server(port=config.tasker_rpc_port):
    app.debug = True
    app.run(port=port)


if __name__ == "__main__":
    run_server()
