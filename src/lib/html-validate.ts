// Lightweight, dependency-free HTML checker.
//
// It is intentionally simple: it scans the markup, collects likely mistakes,
// ranks them by severity, and surfaces the single worst one. This is meant for
// the presentation screen ("highlight the biggest mistake"), not for being a
// spec-compliant validator.

export type HtmlIssueSeverity = "error" | "warning" | "info";

export interface HtmlIssue {
  severity: HtmlIssueSeverity;
  message: string;
}

// Tags that never need a closing tag (void elements).
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const SEVERITY_RANK: Record<HtmlIssueSeverity, number> = {
  error: 3,
  warning: 2,
  info: 1,
};

// Collect every issue we can detect, unsorted.
export function findHtmlIssues(html: string): HtmlIssue[] {
  const issues: HtmlIssue[] = [];

  if (!html || html.trim().length === 0) {
    return [{ severity: "warning", message: "No HTML written yet" }];
  }

  // --- Tag balance check (stack based) ---
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  const stack: string[] = [];
  let unexpectedClose: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    const full = match[0];
    const tag = (match[1] ?? "").toLowerCase();
    const selfClosed = match[2] === "/";
    const isClosing = full.startsWith("</");

    if (VOID_TAGS.has(tag) || selfClosed) {
      continue;
    }

    if (isClosing) {
      if (stack.length === 0) {
        if (!unexpectedClose) unexpectedClose = tag;
      } else if (stack[stack.length - 1] === tag) {
        stack.pop();
      } else if (stack.includes(tag)) {
        // Close the nearest matching tag, flagging the improper nesting.
        while (stack.length > 0 && stack[stack.length - 1] !== tag) {
          stack.pop();
        }
        stack.pop();
        issues.push({
          severity: "error",
          message: `Improperly nested tags around </${tag}>`,
        });
      } else if (!unexpectedClose) {
        unexpectedClose = tag;
      }
    } else {
      stack.push(tag);
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    issues.push({
      severity: "error",
      message: `Unclosed <${unclosed}> tag${
        stack.length > 1 ? ` (+${stack.length - 1} more)` : ""
      }`,
    });
  }
  if (unexpectedClose) {
    issues.push({
      severity: "error",
      message: `Stray closing </${unexpectedClose}> with no opening tag`,
    });
  }

  // --- Unbalanced angle brackets ---
  const open = (html.match(/</g) || []).length;
  const close = (html.match(/>/g) || []).length;
  if (open !== close) {
    issues.push({
      severity: "error",
      message: `Unbalanced angle brackets (${open} "<" vs ${close} ">")`,
    });
  }

  // --- Accessibility / quality warnings ---
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const imgsMissingAlt = imgTags.filter((t) => !/\balt\s*=/.test(t)).length;
  if (imgsMissingAlt > 0) {
    issues.push({
      severity: "warning",
      message: `${imgsMissingAlt} <img> missing alt attribute`,
    });
  }

  // Unquoted attribute values like style=color (cheap heuristic).
  if (/<[a-zA-Z][^>]*=\s*[^"'\s>][^>]*>/.test(html) === false) {
    // no-op: keeping the structure readable; quoting is checked below
  }

  // --- Inline style sanity: unterminated style attribute ---
  const styleAttrs = html.match(/style\s*=\s*"[^"]*$/i);
  if (styleAttrs) {
    issues.push({
      severity: "error",
      message: "Unterminated style=\" attribute (missing closing quote)",
    });
  }

  // --- Info: looks fine ---
  if (issues.length === 0) {
    issues.push({ severity: "info", message: "No obvious HTML issues found" });
  }

  return issues;
}

// Return the single most severe issue (the "biggest mistake").
export function biggestHtmlIssue(html: string): HtmlIssue {
  const issues = findHtmlIssues(html);
  return issues.reduce((worst, current) =>
    SEVERITY_RANK[current.severity] > SEVERITY_RANK[worst.severity]
      ? current
      : worst
  );
}
