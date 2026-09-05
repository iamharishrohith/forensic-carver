"""
Convenience test runner from project root.
Runs both the synthetic unit test suite and the real-world internet dataset integration test.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from carving.tests.run_tests import TestForensicCarver
from carving.tests.test_internet_synthetic_carving import TestInternetSyntheticCarving

if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestForensicCarver))
    suite.addTests(loader.loadTestsFromTestCase(TestInternetSyntheticCarving))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
