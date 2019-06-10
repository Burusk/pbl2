import datetime
import os
import sqlite3

from flask import Flask, redirect
from flask_restful import Resource, Api
from flask_restful import reqparse

app = Flask(__name__, static_url_path='', static_folder='static')
api = Api(app)

filename = './chat.db'
try:
    os.remove(filename)
except OSError:
    pass


def execute(query, parameters=(), result_mapper=None):
    result = None

    conn = sqlite3.connect(filename)
    c = conn.cursor()
    c.execute(query, parameters)
    conn.commit()

    if result_mapper:
        result = result_mapper(c)

    conn.close()

    return result


execute('CREATE TABLE message(id integer primary key autoincrement, nickname text, msg text, ts integer)')


class ChatMessage(Resource):
    def get(self):
        def message_result_mapper(c):
            messages = []
            for row in c:
                messages.append({
                    'id': row[0],
                    'nickname': row[1],
                    'message': row[2],
                    'timestamp': row[3],
                })
            return messages

        parser = reqparse.RequestParser()
        parser.add_argument('last_timestamp', type=int)
        args = parser.parse_args()

        last_timestamp = args['last_timestamp']

        if not last_timestamp:
            last_timestamp = 0

        messages = execute(
            'SELECT * FROM message WHERE ts > ? ORDER BY ts ASC',
            parameters=(last_timestamp,),
            result_mapper=message_result_mapper,
        )

        return {'messages': messages}

    def post(self):
        try:
            parser = reqparse.RequestParser()
            parser.add_argument('nickname', type=str)
            parser.add_argument('message', type=str)
            args = parser.parse_args()

            execute(
                'INSERT INTO message(nickname, msg, ts) VALUES (?, ?, ?)',
                parameters=(args['nickname'], args['message'], int(datetime.datetime.now().timestamp())),
            )

            return {'nickname': args['nickname'], 'message': args['message']}
        except Exception as e:
            return {'error': str(e)}


class User(Resource):
    def get(self):
        def user_result_mapper(c):
            messages = []
            for row in c:
                messages.append({
                    'nickname': row[0],
                    'message_count': row[1],
                    'last_timestamp': row[2]
                })
            return messages

        parser = reqparse.RequestParser()
        parser.add_argument('keyword', type=str)
        args = parser.parse_args()

        keyword = args['keyword']

        if keyword:
            users = execute(
                "SELECT nickname, count(*) message_count, max(ts) last_ts FROM message WHERE nickname LIKE '%'||?||'%' GROUP BY nickname ORDER BY message_count DESC, last_ts DESC",
                parameters=(keyword,),
                result_mapper=user_result_mapper,
            )
        else:
            users = execute(
                "SELECT nickname, count(*) message_count, max(ts) last_ts FROM message GROUP BY nickname ORDER BY message_count DESC",
                result_mapper=user_result_mapper,
            )

        return {'users': users}


api.add_resource(ChatMessage, '/chat')
api.add_resource(User, '/user')


@app.route('/')
def index():
    return redirect("/index.html", code=302)


if __name__ == '__main__':
    app.run(debug=True)
