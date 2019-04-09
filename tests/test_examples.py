# This is a simple test suite for the examples. We use pytest to run the tests
# and selenium to render the example pages. We then make sure that no unexpected
# warnings or errors are output to the log. To run this test suite, you will
# need the following Python dependencies:
#
#   pip install pytest flask flask-cors selenium
#
# as well as the chromedriver for selenium. You can then run the tests with:
#
#   pytest tests/test_examples.py


import os
import glob
import pytest

from helpers import open_in_chrome, wait_for_finished

HTML_FILES = glob.glob(os.path.join(os.path.dirname(__file__), '..',
                       'examples', '*.html'))


@pytest.mark.parametrize('index', HTML_FILES)
def test_page(index):

    driver = open_in_chrome(index)

    # For now, the only page with more than one plot is index.html. In fact
    # there are six plots there, not 4, but two require manual clicking, which
    # we could simulate here
    number = 4 if index.endswith('index.html') else 1

    try:
        logs = wait_for_finished(driver, number=number)
        assert logs == []
    finally:
        driver.quit()
