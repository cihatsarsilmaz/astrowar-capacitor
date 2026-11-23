"""Read-only GitHub REST transport for GÖLGE AI collector.

Requires a GitHub App installation token provided by a trusted runner.
Does not mint tokens, persist secrets, or issue write requests.
"""
import json
import os
from urllib import request, error
from urllib.parse import urlsplit

REPO = "cihatsarsilmaz/astrowar-capacitor"
ROOT = "/repos/" + REPO
ALLOWED = (
    ROOT + "/actions/runs",
    ROOT + "/commits/",
)


class GitHubReadOnlyError(RuntimeError):
    pass


class GitHubReadOnlyClient:
    authenticated = True  # set only after token is supplied

    def __init__(self, token, opener=None):
        if not isinstance(token, str) or not token.strip() or "\n" in token or "\r" in token:
            raise GitHubReadOnlyError("GitHub App installation token required")
        self._token = token
        self._opener = opener or request.urlopen

    @classmethod
    def from_environment(cls, opener=None):
        return cls(os.environ.get("GOLGE_GITHUB_INSTALLATION_TOKEN"), opener)

    def get(self, path):
        if not isinstance(path, str) or "#" in path or "%" in path or ".." in path:
            raise GitHubReadOnlyError("invalid path")
        parts = urlsplit(path)
        if parts.scheme or parts.netloc or parts.fragment:
            raise GitHubReadOnlyError("absolute URL refused")
        valid_runs = parts.path == ROOT + "/actions/runs"
        prefix = ROOT + "/commits/"
        valid_checks = (parts.path.startswith(prefix) and
                        parts.path.endswith("/check-runs") and
                        len(parts.path) == len(prefix) + 40 + len("/check-runs") and
                        all(c in "0123456789abcdef"
                            for c in parts.path[len(prefix):-len("/check-runs")]))
        if not (valid_runs or valid_checks):
            raise GitHubReadOnlyError("endpoint not allowlisted")
        query = parts.query.split("&")
        if valid_runs:
            valid = (len(query) == 3 and query[0].startswith("head_sha=") and
                     len(query[0]) == len("head_sha=") + 40 and
                     all(c in "0123456789abcdef" for c in query[0][9:]))
        else:
            valid = len(query) == 2
        valid = (valid and query[-2] == "per_page=100" and
                 query[-1].startswith("page=") and
                 query[-1][5:].isdigit() and
                 1 <= int(query[-1][5:]) <= 10)
        if not valid:
            raise GitHubReadOnlyError("unexpected query parameters")
        req = request.Request(
            "https://api.github.com" + path,
            headers={"Authorization": "Bearer " + self._token,
                     "Accept": "application/vnd.github+json",
                     "X-GitHub-Api-Version": "2022-11-28",
                     "User-Agent": "golge-ai-readonly-evidence"},
            method="GET",
        )
        try:
            with self._opener(req, timeout=15) as response:
                if response.status != 200:
                    raise GitHubReadOnlyError("GitHub response not successful")
                if response.headers.get("Content-Type", "").split(";")[0] != "application/json":
                    raise GitHubReadOnlyError("unexpected response content type")
                payload = response.read(2_000_001)
                if len(payload) > 2_000_000:
                    raise GitHubReadOnlyError("oversized GitHub response")
                return json.loads(payload)
        except (error.HTTPError, error.URLError, TimeoutError, ValueError) as exc:
            raise GitHubReadOnlyError("GitHub read failed or access denied") from exc
