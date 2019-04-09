import os
import time
import socket
from threading import Thread
from mimetypes import guess_type

from flask import Flask
from flask_cors import CORS

from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities


class FlaskWrapper(Flask):

    port = None
    host = None

    def run(self, *args, **kwargs):
        self.host = kwargs.get('host', None)
        self.port = kwargs.get('port', None)
        try:
            super(FlaskWrapper, self).run(*args, **kwargs)
        finally:
            self.host = None
            self.port = None


app = FlaskWrapper('DataServer')
CORS(app)


class DataServer(object):

    def __init__(self):
        self._files = {}
        self._thread = Thread(target=self.start_app)
        self._thread.daemon = True
        self._thread.start()
        self._app = app
        while self._app.host is None and self._app.port is None:
            time.sleep(0.1)

    @property
    def port(self):
        return self._app.port

    @property
    def host(self):
        return self._app.host

    def start_app(self):
        host = socket.gethostbyname('localhost')
        for port in range(8000, 9000):
            try:
                return app.run(host=host, port=port)
            except Exception:
                pass
        raise Exception("Could not start up data server")

    def get_file_contents(self, filename):
        with open(filename, 'rb') as f:
            return f.read()

    @property
    def url(self):
        return 'http://' + self.host + ':' + str(self.port)


ds = DataServer()


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def resources(path):
    path = os.path.join(os.path.dirname(__file__), '..', path)
    if 'favicon.ico' in path:
        return ''
    else:
        print(path, {'Content-Type': guess_type(path)[0]})
        return (ds.get_file_contents(path), 200,
                {'Content-Type': guess_type(path)[0]})


def open_in_chrome(path):
    print(path)
    path = os.path.relpath(path, os.path.join(os.path.dirname(__file__), '..'))
    print(path)
    capabilities = DesiredCapabilities.CHROME
    capabilities['loggingPrefs'] = {'browser': 'ALL'}
    driver = webdriver.Chrome(desired_capabilities=capabilities)
    driver.get(ds.url + '/' + path)
    return driver
