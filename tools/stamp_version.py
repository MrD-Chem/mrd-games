#!/usr/bin/env python3
"""
Version stamp for Mr. D's Chemistry Games
=========================================

WHAT IT IS FOR
  GitHub Pages tells browsers to keep a copy of every file for up to 10 minutes.
  Right after you upload changes, a student's browser could mix NEW pages with
  OLD saved copies of the style (.css) and script (.js) files. That can make a
  page look wrong or stop a game from starting.

  This tool gives every style and script link a version tag, for example
      style.css   ->   style.css?v=20261014T1530
  When the tag changes, browsers know they must fetch the new file.

WHEN TO RUN IT
  After changing ANY game file (and before you upload or commit), open Terminal
  in the mrd-games folder and run:

      python3 tools/stamp_version.py

  That's all. It prints the files it updated. Run it as often as you like:
  it replaces the old tag each time, it never piles tags up.

  Optional: give your own tag instead of the date and time, e.g.
      python3 tools/stamp_version.py 2026-spring-1
  (letters, numbers, dots, dashes and underscores only).

WHAT IT CHANGES (and nothing else)
  * In every .html page: links to this site's own .css, .js and .mjs files
    (<link href="...">, <script src="...">). Links to other websites, data:
    links and #anchors are left alone.
  * In every .js / .mjs file: the file names in   import ... from '...'
    export ... from '...'   and   import('...')   lines that point to this
    site's own files, so every part of a game asks for the exact same version.
  * Files inside a "vendor" folder (like Three.js, the 3D library) never
    change, so they get a FIXED tag (Three.js: ?v=r170) instead of the date.
    That way students don't download the big 3D library again after every
    update. The vendor files themselves are never edited.
    If you ever replace Three.js with a newer version, change "r170" in
    FIXED_TAGS below to the new number (e.g. "r171").

  Uses only Python's built-in parts: nothing to install.
"""

import datetime
import hashlib
import os
import re
import sys
from urllib.parse import unquote

# The site's top folder: the folder that contains this "tools" folder.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Files inside a "vendor" folder never change, so they get a fixed tag.
FIXED_TAGS = {
    "three.module.min.js": "r170",  # Three.js release 170
}

SKIP_DIRS = {".git", "node_modules", "tools"}
HTML_EXTS = (".html", ".htm")
JS_EXTS = (".js", ".mjs")
STAMPED_EXTS = (".css", ".js", ".mjs")  # what HTML links get a tag
VALID_TAG = re.compile(r"^[A-Za-z0-9._-]{1,40}$")

# --- HTML -----------------------------------------------------------------
# Comments are skipped; <script>/<style> blocks are matched as a whole so only
# their opening tag is looked at (never the code inside them); any other tag
# is checked for href=/src= attributes.
HTML_TOKEN = re.compile(
    r"<!--.*?-->"
    r"|<(?P<raw>script|style)\b(?P<rawattrs>(?:[^>\"']|\"[^\"]*\"|'[^']*')*)>.*?</(?P=raw)\s*>"
    r"|<[A-Za-z][A-Za-z0-9-]*(?:[^>\"']|\"[^\"]*\"|'[^']*')*>",
    re.S | re.I,
)
# One attribute inside a tag: name, then optionally = and a value. Reading the
# attributes one by one means text inside another attribute's value (like
# alt="src=x.js") is never mistaken for a link.
HTML_ATTR = re.compile(
    r"(?P<pre>\s+(?P<name>[^\s\"'>/=]+)\s*=\s*)"
    r"(?:\"(?P<dq>[^\"]*)\"|'(?P<sq>[^']*)'|(?P<uq>[^\s\"'=<>`]+))"
    r"|\s+[^\s\"'>/=]+",
)

# --- JavaScript modules ---------------------------------------------------
# import x from '...';  import {a,\n b} from '...';  export * from '...';
# (comments inside a multi-line import, even ones with quotes in them, are fine)
JS_STATIC_FROM = re.compile(
    r"(?m)^(?P<pre>[ \t]*(?:import|export)\b"
    r"(?:[^'\"`;/]|/(?![/*])|//[^\n]*(?=\n|$)|/\*(?:[^*]|\*(?!/))*\*/)*?"
    r"(?<![\w$.])from\s*)"
    r"(?P<q>['\"])(?P<url>[^'\"\r\n]+)(?P=q)"
)
# import '...';   (a module loaded only for its side effects)
JS_STATIC_BARE = re.compile(
    r"(?m)^(?P<pre>[ \t]*import\s*)(?P<q>['\"])(?P<url>[^'\"\r\n]+)(?P=q)"
)
# import('...')   (loaded later, when needed)
JS_DYNAMIC = re.compile(
    r"(?P<pre>(?<![\w$.])import\s*\(\s*)(?P<q>['\"`])(?P<url>[^'\"`$\r\n]+)(?P=q)(?=\s*[,)])"
)
# Safety net, used only to WARN: any  from '...'  /  import '...'  /  import('...')
# with a local path that still has no tag after the rewrite (comments are ignored).
JS_ANY_SPEC = re.compile(
    r"(?<![\w$.])(?:from|import)\s*\(?\s*(['\"`])(\.{1,2}/[^'\"`\r\n]*|/(?!/)[^'\"`\r\n]*)\1"
)
# Strings are matched too (and skipped), so a "//" inside 'http://...' is not a comment.
JS_COMMENT = re.compile(
    r"'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\"|`(?:[^`\\]|\\.)*`"
    r"|(?P<c>/\*[\s\S]*?\*/|//[^\n]*)"
)

EXTERNAL = re.compile(r"^(?:[A-Za-z][A-Za-z0-9+.-]*:|//)")  # http:, https:, data:, mailto:, //host


def is_local(url):
    url = url.strip()
    return bool(url) and not url.startswith("#") and not EXTERNAL.match(url)


def split_url(url):
    """'a/b.js?x=1#f' -> ('a/b.js', 'x=1', '#f')"""
    base, hash_mark, frag = url.partition("#")
    path, _, query = base.partition("?")
    return path, query, hash_mark + frag


def with_tag(url, tag, html=False):
    """Add ?v=<tag>, or replace an existing v=..., keeping any other parameters."""
    path, query, frag = split_url(url)
    amp = "&amp;" if (html and "&amp;" in query) else "&"
    params = [p for p in re.split(r"&amp;|&", query) if p and not re.match(r"v(?:=|$)", p)]
    params.append("v=" + tag)
    return path + "?" + amp.join(params) + frag


def resolve(from_file, path):
    """Where on disk a link points, as a site path like 'games/x/js/a.js'."""
    path = unquote(path)
    if path.startswith("/"):
        target = os.path.join(ROOT, path.lstrip("/"))
    else:
        target = os.path.join(os.path.dirname(from_file), path)
    return os.path.relpath(os.path.normpath(target), ROOT).replace(os.sep, "/")


class Stamper:
    def __init__(self, stamp):
        self.stamp = stamp
        self.warnings = []
        self.seen = {}  # site path -> {full query string: [files that use it]}
        self._vendor_tags = {}

    def tag_for(self, target):
        parts = target.split("/")
        if "vendor" not in parts[:-1]:
            return self.stamp
        if target not in self._vendor_tags:
            name = parts[-1]
            tag = FIXED_TAGS.get(name)
            full = os.path.join(ROOT, target)
            if tag is None:
                # Unknown vendor file: tag it by its contents, so the tag only
                # changes if the file itself is ever replaced.
                try:
                    with open(full, "rb") as fh:
                        tag = "h" + hashlib.sha1(fh.read()).hexdigest()[:10]
                except OSError:
                    tag = self.stamp
            elif name == "three.module.min.js":
                self._check_three_revision(full, tag)
            self._vendor_tags[target] = tag
        return self._vendor_tags[target]

    def _check_three_revision(self, full, tag):
        try:
            with open(full, "r", encoding="utf-8", errors="replace") as fh:
                code = fh.read()
        except OSError:
            return
        alias = re.search(r"\b([A-Za-z_$][\w$]*) as REVISION\b", code)
        if not alias:
            return
        rev = re.search(r"\b" + re.escape(alias.group(1)) + r"\s*=\s*\"(\d+)\"", code)
        if rev and "r" + rev.group(1) != tag:
            self.warnings.append(
                "Three.js in vendor/ is release r%s but FIXED_TAGS says %s. "
                "Edit FIXED_TAGS in tools/stamp_version.py." % (rev.group(1), tag)
            )

    def retag(self, from_file, url, html):
        """Return the url with the right tag, or None if it should be left alone."""
        path, query, _ = split_url(url)
        target = resolve(from_file, path)
        tag = self.tag_for(target)
        new = with_tag(url, tag, html=html)
        if not os.path.isfile(os.path.join(ROOT, target)):
            self.warnings.append("%s links to %s, but that file does not exist."
                                 % (os.path.relpath(from_file, ROOT), path))
        new_query = split_url(new)[1].replace("&amp;", "&")
        self.seen.setdefault(target, {}).setdefault(new_query, []).append(
            os.path.relpath(from_file, ROOT).replace(os.sep, "/"))
        return new

    # -- per file type --
    def html(self, fpath, text):
        count = [0]

        def fix_attrs(tag_text):
            def one(m):
                if not m.group("name") or m.group("name").lower() not in ("href", "src"):
                    return m.group(0)
                url = m.group("dq") if m.group("dq") is not None else (
                    m.group("sq") if m.group("sq") is not None else m.group("uq"))
                if not is_local(url):
                    return m.group(0)
                if not split_url(url.strip())[0].lower().endswith(STAMPED_EXTS):
                    return m.group(0)
                new = self.retag(fpath, url.strip(), html=True)
                if new != url:
                    count[0] += 1
                q = '"' if m.group("dq") is not None else ("'" if m.group("sq") is not None else '"')
                return m.group("pre") + q + new + q
            return HTML_ATTR.sub(one, tag_text)

        def token(m):
            whole = m.group(0)
            if whole.startswith("<!--"):
                return whole
            if m.group("raw"):
                # Rewrite only the opening <script ...>/<style ...> tag.
                open_end = m.start("rawattrs") - m.start() + len(m.group("rawattrs")) + 1
                return fix_attrs(whole[:open_end]) + whole[open_end:]
            return fix_attrs(whole)

        return HTML_TOKEN.sub(token, text), count[0]

    def js(self, fpath, text):
        count = [0]

        def one(m):
            url = m.group("url")
            if not url.startswith(("./", "../", "/")) or url.startswith("//"):
                return m.group(0)  # bare names and full web addresses: leave alone
            new = self.retag(fpath, url, html=False)
            if new != url:
                count[0] += 1
            return m.group("pre") + m.group("q") + new + m.group("q")

        for rx in (JS_STATIC_FROM, JS_STATIC_BARE, JS_DYNAMIC):
            text = rx.sub(one, text)
        self._untagged_imports(fpath, text)
        return text, count[0]

    def _untagged_imports(self, fpath, text):
        comments = [m.span() for m in JS_COMMENT.finditer(text) if m.group("c")]
        for m in JS_ANY_SPEC.finditer(text):
            if any(a <= m.start() < b for a, b in comments):
                continue
            query = split_url(m.group(2))[1]
            if any(p.startswith("v=") for p in query.split("&")):
                continue
            self.warnings.append(
                "%s line %d: could not add a version tag to %s. Put that import on a "
                "line of its own, like  import { x } from './file.js';  and run the tool again."
                % (os.path.relpath(fpath, ROOT).replace(os.sep, "/"),
                   text.count("\n", 0, m.start()) + 1, m.group(2)))


def site_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS and not d.startswith("."))
        rel_dir = os.path.relpath(dirpath, ROOT).replace(os.sep, "/")
        in_vendor = "vendor" in rel_dir.split("/")
        for name in sorted(filenames):
            low = name.lower()
            if low.endswith(HTML_EXTS):
                yield os.path.join(dirpath, name), "html"
            elif low.endswith(JS_EXTS) and not in_vendor:
                yield os.path.join(dirpath, name), "js"


def main(argv):
    args = argv[1:]
    if args and args[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    if len(args) > 1:
        print("Use:  python3 tools/stamp_version.py [tag]")
        return 2
    stamp = args[0] if args else datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M")
    if not VALID_TAG.match(stamp):
        print("The tag %r has characters that can't be used. Use only letters, numbers, "
              "dots, dashes and underscores." % stamp)
        return 2

    stamper = Stamper(stamp)
    changed = []
    for fpath, kind in site_files():
        with open(fpath, "r", encoding="utf-8", newline="") as fh:
            old = fh.read()
        new, n = (stamper.html if kind == "html" else stamper.js)(fpath, old)
        if new != old:
            with open(fpath, "w", encoding="utf-8", newline="") as fh:
                fh.write(new)
            changed.append((os.path.relpath(fpath, ROOT).replace(os.sep, "/"), n))

    print("Version tag: %s" % stamp)
    fixed = sorted(set(stamper._vendor_tags.values()))
    if fixed:
        print("Vendor files keep their fixed tag: %s" % ", ".join(fixed))
    if changed:
        print("Updated %d file%s:" % (len(changed), "" if len(changed) == 1 else "s"))
        width = max(len(p) for p, _ in changed)
        for path, n in changed:
            print("  %-*s  %d link%s" % (width, path, n, "" if n == 1 else "s"))
    else:
        print("Nothing to change: every link already has this tag.")

    # Safety check: each file must be asked for with ONE exact address everywhere,
    # otherwise a browser could load (and run) the same module twice.
    for target, queries in sorted(stamper.seen.items()):
        if len(queries) > 1:
            detail = "; ".join("?%s in %s" % (q, ", ".join(sorted(set(f)))) for q, f in queries.items())
            stamper.warnings.append("%s is linked with different addresses: %s" % (target, detail))

    for w in stamper.warnings:
        print("WARNING: " + w)
    return 1 if stamper.warnings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
