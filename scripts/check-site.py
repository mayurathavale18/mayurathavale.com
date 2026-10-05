"""Run after Hugo: python scripts/check-site.py. Uses only the standard library."""

import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.links = []
        self.schemas = []
        self.schema = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a":
            self.links.append(attrs.get("href", ""))
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.schema = ""

    def handle_data(self, data):
        if self.schema is not None:
            self.schema += data

    def handle_endtag(self, tag):
        if tag == "script" and self.schema is not None:
            self.schemas.append(json.loads(self.schema))
            self.schema = None


root = Path(__file__).resolve().parents[1] / "public"
home = (root / "index.html").read_text(encoding="utf-8")
assert home.index("Featured Projects") < home.index("Latest Posts")
for path in (root / "index.html", root / "projects/index.html"):
    text = path.read_text(encoding="utf-8")
    order = [text.index(name) for name in ("Agent Bridge", "Jobwatch", "Hermes Plugin")]
    assert order == sorted(order), path
for path in (root / "index.html", root / "about/index.html"):
    page = Page(path.read_text(encoding="utf-8"))
    assert page.links.index("https://mayatdev1569.medium.com") < page.links.index("https://x.com/mayatdev1569")
for route, kind in (("index.html", "WebSite"), ("about/index.html", "ProfilePage"), ("for-ai/index.html", "ProfilePage")):
    schemas = Page((root / route).read_text(encoding="utf-8")).schemas
    assert len(schemas) == 1 and schemas[0]["@type"] == kind, route
    person = schemas[0].get("mainEntity", schemas[0].get("author"))
    assert person["name"] == "Mayur Athavale" and person["@type"] == "Person"
    assert "https://mayatdev1569.medium.com" in person["sameAs"]
ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
urls = [item.text for item in ElementTree.parse(root / "sitemap.xml").findall("s:url/s:loc", ns)]
assert len(urls) == len(set(urls))
for route in ("/", "/about/", "/for-ai/", "/projects/agent-bridge/", "/projects/jobwatch/", "/projects/hermes-plugin/"):
    assert "https://mayurathavale.com" + route in urls, route
for url in urls:
    parsed = urlparse(url)
    assert parsed.netloc == "mayurathavale.com" and not parsed.query
    assert not parsed.path.startswith(("/tags/", "/categories/"))
    assert (root / parsed.path.lstrip("/") / "index.html").exists(), url
robots = (root / "robots.txt").read_text()
assert "User-agent: *" in robots and "Allow: /" in robots
assert "Disallow:" not in robots and "Sitemap: https://mayurathavale.com/sitemap.xml" in robots
assert "https://mayurathavale.com/for-ai/" in (root / "llms.txt").read_text()
resume = (root / "resume/index.html").read_text()
assert 'http-equiv="refresh"' in resume and "1xBZrOwoQ__H34YFiSfwYG16gFu6iQAQo/view" in resume
print("Site checks passed: ordering, links, resume redirect, structured data, robots and sitemap.")
