import unittest
from scripts.golge_ai_operation_timer import timer_state

START = "2026-11-23T03:00:00Z"


class TimerTests(unittest.TestCase):
    def test_initial_state(self):
        state = timer_state(START, START)
        self.assertEqual(state["wait_remaining_seconds"], 600)
        self.assertEqual(state["review_remaining_seconds"], 900)
        self.assertFalse(state["automatic_approval"])

    def test_after_ten_minutes(self):
        state = timer_state(START, "2026-11-23T03:10:00Z")
        self.assertTrue(state["wait_elapsed"])
        self.assertFalse(state["review_due"])
        self.assertEqual(state["state"], "AWAITING_REVIEW")

    def test_after_fifteen_minutes(self):
        state = timer_state(START, "2026-11-23T03:15:00Z")
        self.assertTrue(state["review_due"])
        self.assertEqual(state["state"], "REVIEW_DUE")
        self.assertFalse(state["merge_permitted"])
        self.assertFalse(state["deploy_permitted"])

    def test_stop_overrides_review(self):
        state = timer_state(START, "2026-11-23T03:20:00Z", stop=True)
        self.assertEqual(state["state"], "STOPPED")
        self.assertFalse(state["automatic_approval"])

    def test_future_start_rejected(self):
        with self.assertRaises(ValueError):
            timer_state(START, "2026-11-23T02:59:59Z")

    def test_timezone_required(self):
        with self.assertRaises(ValueError):
            timer_state(START, "2026-11-23T03:01:00")

    def test_timezone_conversion(self):
        state = timer_state(START, "2026-11-23T06:10:00+03:00")
        self.assertEqual(state["elapsed_seconds"], 600)


if __name__ == "__main__":
    unittest.main()
