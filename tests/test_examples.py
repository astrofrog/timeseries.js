import os
import time
import glob
import pytest

from helpers import open_in_chrome

HTML_FILES = glob.glob(os.path.join(os.path.dirname(__file__), '..',
                       'examples', '*.html'))


@pytest.mark.parametrize('index', HTML_FILES)
def test_page(index):

    driver = open_in_chrome(index)

    try:
        time.sleep(5)
        for entry in driver.get_log('browser'):
            if '%ctimeseries.js' not in entry['message']:
                raise ValueError("Unexpected JS message: {0}".format(entry))
    finally:
        driver.quit()
