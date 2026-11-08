#!/usr/bin/env python3
"""Tests for scripts/classify_severity.py. Standard library only.

    python3 -m unittest discover -s scripts -p "test_*.py"
"""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import classify_severity as cs  # noqa: E402


class ShortKeywordBoundaryTests(unittest.TestCase):
    def test_tree_does_not_match_inside_street(self):
        # "Street Locator" used to classify as `relatives` because "tree"
        # is a substring of "street".
        self.assertEqual(cs.classify("Street Locator", "", ""), "address")

    def test_home_does_not_match_inside_homepage(self):
        # Assert on the matcher, not on the final bucket: "Homepage Builder"
        # falls through to the generalist default of `address` either way.
        toks = cs.tokens("Homepage Builder")
        self.assertFalse(cs.matches("home", cs.norm("Homepage Builder"), toks))
        self.assertTrue(cs.matches("home", cs.norm("Home Page"), cs.tokens("Home Page")))

    def test_family_tree_sites_still_classify_as_relatives(self):
        for name in ("Family Tree Now", "FamilyTreeNow", "Ancestry", "Find A Grave", "Obituary Files"):
            with self.subTest(name=name):
                self.assertEqual(cs.classify(name, "", ""), "relatives")

    def test_whole_word_tree_still_matches(self):
        self.assertEqual(cs.classify("Tree Records", "", ""), "relatives")


class LongKeywordBehaviourIsUnchanged(unittest.TestCase):
    def test_stem_matching_still_works_for_long_keywords(self):
        # These rely on substring matching and must keep working.
        self.assertEqual(cs.classify("All Area Codes", "", ""), "phone")
        self.assertEqual(cs.classify("Phonebooks", "", ""), "phone")
        self.assertEqual(cs.classify("Pilot Telephone Directory", "", ""), "phone")
        self.assertEqual(cs.classify("Reverse Lookup", "", ""), "phone")

    def test_numeric_keyword_matches_as_token(self):
        self.assertEqual(cs.classify("411", "", ""), "phone")

    def test_generalist_default_is_address(self):
        self.assertEqual(cs.classify("Some Random People Search", "", ""), "address")


class MultiWordKeywordTests(unittest.TestCase):
    def test_joined_name_still_matches(self):
        self.assertEqual(cs.classify("Family Tree Now", "", ""), "relatives")

    def test_url_participates_in_matching(self):
        self.assertEqual(
            cs.classify("Acme", "https://www.spokeo.com/optout", ""), "social"
        )


if __name__ == "__main__":
    unittest.main()
