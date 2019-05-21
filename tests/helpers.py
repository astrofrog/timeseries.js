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
        return (ds.get_file_contents(path), 200,
                {'Content-Type': guess_type(path)[0]})


def open_in_chrome(path):
    path = os.path.relpath(path, os.path.join(os.path.dirname(__file__), '..'))
    capabilities = DesiredCapabilities.CHROME
    capabilities['loggingPrefs'] = {'browser': 'ALL'}
    driver = webdriver.Chrome(desired_capabilities=capabilities)
    driver.get(ds.url + '/' + path)
    return driver


SCROLL_SCRIPT = """
if(typeof scrolling === 'undefined' || scrolling != true) {
    scrolling = true;
    console.log("Scrolling");
    window.scrollBy({top: document.body.scrollHeight, left: 0, behavior: 'smooth'});
    scrolling = false;
}
"""

def wait_for_finished(driver, timeout=60, number=1):
    logs = []
    start = time.time()
    finished = 0
    while time.time() - start < timeout:
        for entry in driver.get_log('browser'):
            if 'Finished processing' in entry['message']:
                finished += 1
            elif 'timeseries.js' not in entry['message'] and 'Scrolling' not in entry['message']:
                logs.append(entry)
            if 'SEVERE' in entry['level']:
                raise Exception(entry['message'])
        if finished == number:
            return logs
        elif finished > number:
            raise ValueError("Too many figures were finalized")
        driver.execute_script(SCROLL_SCRIPT)
        time.sleep(0.5)

    raise TimeoutError('Timed out while waiting for all plots to load')
