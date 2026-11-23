"""GitHub Issues backed incident history. No secrets or arbitrary event text stored.

Use a repository-scoped token with issues:write only in trusted workflows.
GitHub Issues persists beyond individual runner lifetimes. Writes require a
single-writer workflow concurrency group; GitHub does not provide atomic
compare-and-create for issues.
"""
import hashlib
import json
import re
from urllib.parse import quote

VALID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$")
PREFIX = "[GOLGE-STATE] "


def incident_key(project, event):
    if not isinstance(project, str) or not VALID.fullmatch(project):
        raise ValueError("Invalid project identifier")
    if not isinstance(event, str) or not VALID.fullmatch(event):
        raise ValueError("Invalid event identifier")
    return hashlib.sha256((project + "\0" + event).encode("utf-8")).hexdigest()


class IssuesLedger:
    """API object exposes get(path)->dict/list and post(path, payload)->dict."""

    def __init__(self, api, owner, repository):
        for name in (owner, repository):
            if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", name):
                raise ValueError("Invalid repository")
        self.api = api
        self.base = "/repos/" + quote(owner, safe="") + "/" + quote(repository, safe="") + "/issues"

    def _find(self, title):
        page = 1
        while True:
            issues = self.api.get(self.base + "?state=all&per_page=100&page=" + str(page))
            if not isinstance(issues, list):
                raise ValueError("Invalid GitHub issues response")
            for issue in issues:
                if not isinstance(issue, dict):
                    raise ValueError("Invalid issue")
                if "pull_request" not in issue and issue.get("title") == title:
                    return issue
            if len(issues) < 100:
                return None
            page += 1
            if page > 1000:
                raise RuntimeError("Issue history too large; refusing uncertain write")

    def record_once(self, project, event, reference=""):
        key = incident_key(project, event)
        if not isinstance(reference, str) or not re.fullmatch(r"https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(actions/runs|issues|pull)/[0-9]+", reference):
            raise ValueError("Reference must be a GitHub run, issue or PR URL")
        title = PREFIX + key
        existing = self._find(title)
        if existing:
            return False, existing
        body = json.dumps({"schema_version": 1, "project": project, "event": event, "reference": reference}, sort_keys=True)
        return True, self.api.post(self.base, {"title": title, "body": body})
