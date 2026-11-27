import io
import json
import unittest
from urllib.error import HTTPError
from scripts.golge_ai_github_readonly_client import GitHubReadOnlyClient, GitHubReadOnlyError

ROOT = "/repos/cihatsarsilmaz/astrowar-capacitor"
SHA = "a" * 40


class Response:
    status = 200
    headers = {"Content-Type": "application/json"}
    def __init__(self, body=b'{"total_count":0,"workflow_runs":[]}'):
        self.body = body
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False
    def read(self, limit):
        return self.body[:limit]


class ReadOnlyClientTests(unittest.TestCase):
    def test_get_workflow_runs(self):
        seen = []
        def opener(req, timeout):
            seen.append((req, timeout))
            return Response()
        client = GitHubReadOnlyClient("test-token", opener)
        result = client.get(ROOT + "/actions/runs?head_sha=" + SHA + "&per_page=100&page=1")
        self.assertEqual(result["total_count"], 0)
        self.assertEqual(seen[0][0].get_method(), "GET")
        self.assertEqual(seen[0][1], 15)
        self.assertTrue(seen[0][0].full_url.startswith("https://api.github.com/"))

    def test_get_check_runs(self):
        client = GitHubReadOnlyClient("test-token", lambda req, timeout: Response(b'{"total_count":0,"check_runs":[]}'))
        self.assertEqual(client.get(ROOT + "/commits/" + SHA + "/check-runs?per_page=100&page=1")["check_runs"], [])

    def test_missing_token_fails(self):
        with self.assertRaises(GitHubReadOnlyError):
            GitHubReadOnlyClient("")

    def test_unapproved_endpoints_fail_without_request(self):
        client = GitHubReadOnlyClient("token", lambda req, timeout: self.fail("network must not run"))
        paths = [
            "https://evil.example/", ROOT + "/issues?per_page=100&page=1",
            ROOT + "/actions/runs?head_sha=" + SHA + "&per_page=100&page=0",
            ROOT + "/actions/runs?head_sha=" + SHA + "&per_page=100&page=11",
            ROOT + "/actions/runs?head_sha=" + SHA + "&per_page=100&page=1&x=1",
            ROOT + "/commits/" + "b" * 39 + "/check-runs?per_page=100&page=1",
        ]
        for path in paths:
            with self.subTest(path=path), self.assertRaises(GitHubReadOnlyError):
                client.get(path)

    def test_http_denial_fails_closed(self):
        def denied(req, timeout):
            raise HTTPError(req.full_url, 403, "forbidden", {}, None)
        client = GitHubReadOnlyClient("token", denied)
        with self.assertRaises(GitHubReadOnlyError):
            client.get(ROOT + "/actions/runs?head_sha=" + SHA + "&per_page=100&page=1")

    def test_oversized_response_fails(self):
        client = GitHubReadOnlyClient("token", lambda req, timeout: Response(b"x" * 2_000_001))
        with self.assertRaises(GitHubReadOnlyError):
            client.get(ROOT + "/actions/runs?head_sha=" + SHA + "&per_page=100&page=1")


if __name__ == "__main__":
    unittest.main()
