import { describe, expect, it } from "vitest";
import {
  balanceOut,
  evaluateMath,
  expandAbbreviation,
  incrementNumber,
  removeTag,
  splitJoinTag,
  updateTag,
  wrapWithAbbreviation,
} from "../../../src/Language/emmet.js";
import { code } from "../harness.js";

// Proposed module src/Language/emmet.ts (VS Code's built-in Emmet).
//   expandAbbreviation(abbreviation, { syntax: "html" | "css" }) -> text
//     with the tab stops left out; nested elements are indented with "\t"
//     and inline elements (a, span, em, ...) stay on one line
//   wrapWithAbbreviation(text, abbreviation) -> text
//   balanceOut(text, selection: [start, end]) -> the next bigger [start, end]
//   removeTag / updateTag(text, offset, newName?) / splitJoinTag(text, offset)
//   incrementNumber(text, offset, delta) / evaluateMath(text, offset)
//     -> the changed text
// Abbreviation syntax: > child, + sibling, ^ climb up, *N repeat, $ number
// ($$ zero-padded, @- reverse, @N start), . class, # id, [attr=value],
// {text}, ( ) groups, and implicit tags (li inside ul, td inside tr, span
// inside inline elements, div elsewhere).

const html = (abbreviation: string) => expandAbbreviation(abbreviation, { syntax: "html" });
const css = (abbreviation: string) => expandAbbreviation(abbreviation, { syntax: "css" });

describe("HTML elements", () => {
  it("a tag", () => {
    expect(html("div")).eq("<div></div>");
  });

  it("a class and an id make a div", () => {
    expect(html(".foo")).eq('<div class="foo"></div>');
    expect(html("#bar")).eq('<div id="bar"></div>');
  });

  it("id and classes together", () => {
    expect(html("div#header.title.big")).eq('<div id="header" class="title big"></div>');
  });

  it("default attributes for common tags", () => {
    expect(html("a")).eq('<a href=""></a>');
    expect(html("img")).eq('<img src="" alt="">');
    expect(html("input")).eq('<input type="text">');
  });

  it("empty elements have no closing tag", () => {
    expect(html("br")).eq("<br>");
  });

  it("attributes in brackets", () => {
    expect(html("a[href=x title='y z']")).eq('<a href="x" title="y z"></a>');
  });

  it("text in braces", () => {
    expect(html("p{hello}")).eq("<p>hello</p>");
  });
});

describe("HTML structure", () => {
  it("> nests", () => {
    expect(html("ul>li")).eq("<ul>\n\t<li></li>\n</ul>");
  });

  it("* repeats", () => {
    expect(html("ul>li*3")).eq("<ul>\n\t<li></li>\n\t<li></li>\n\t<li></li>\n</ul>");
  });

  it("+ adds a sibling", () => {
    expect(html("div+p")).eq("<div></div>\n<p></p>");
  });

  it("^ climbs back up a level", () => {
    expect(html("div>p^span")).eq("<div>\n\t<p></p>\n</div>\n<span></span>");
  });

  it("( ) groups", () => {
    expect(html("(div>p)+span")).eq("<div>\n\t<p></p>\n</div>\n<span></span>");
  });

  it("inline elements stay on one line", () => {
    expect(html("p>a")).eq('<p><a href=""></a></p>');
  });
});

describe("numbering", () => {
  it("$ numbers repeated elements", () => {
    expect(html("li.item$*3")).eq(
      '<li class="item1"></li>\n<li class="item2"></li>\n<li class="item3"></li>',
    );
  });

  it("$$ pads with zeros", () => {
    expect(html("li.item$$*2")).eq('<li class="item01"></li>\n<li class="item02"></li>');
  });

  it("@- counts down", () => {
    expect(html("li.item$@-*3")).eq(
      '<li class="item3"></li>\n<li class="item2"></li>\n<li class="item1"></li>',
    );
  });

  it("@N starts from N", () => {
    expect(html("li.item$@3*2")).eq('<li class="item3"></li>\n<li class="item4"></li>');
  });

  it("works in text too", () => {
    expect(html("p*2>{x$}")).eq("<p>x1</p>\n<p>x2</p>");
  });
});

describe("implicit tags", () => {
  it("li inside ul", () => {
    expect(html("ul>.x")).eq('<ul>\n\t<li class="x"></li>\n</ul>');
  });

  it("tr and td inside a table", () => {
    expect(html("table>.r>.c")).eq(
      '<table>\n\t<tr class="r">\n\t\t<td class="c"></td>\n\t</tr>\n</table>',
    );
  });

  it("span inside an inline element", () => {
    expect(html("em>.x")).eq('<em><span class="x"></span></em>');
  });
});

describe("snippets", () => {
  it("! is the HTML5 page", () => {
    const page = html("!");

    expect(page).toContain("<!DOCTYPE html>");
    expect(page).toContain('<meta name="viewport"');
    expect(page).toContain("<body>");
  });

  it("lorem makes the given number of words", () => {
    expect(html("lorem5").replace(/[.,]/g, "").split(/\s+/)).toHaveLength(5);
  });
});

describe("CSS", () => {
  it("a property with a number gets px", () => {
    expect(css("m10")).eq("margin: 10px;");
  });

  it("several values", () => {
    expect(css("p10-20")).eq("padding: 10px 20px;");
  });

  it("negative values", () => {
    expect(css("m-10")).eq("margin: -10px;");
  });

  it("p means percent, a decimal gets em", () => {
    expect(css("w100p")).eq("width: 100%;");
    expect(css("m1.5")).eq("margin: 1.5em;");
  });

  it("line-height has no unit", () => {
    expect(css("lh1.5")).eq("line-height: 1.5;");
  });

  it("keyword values after a colon", () => {
    expect(css("pos:a")).eq("position: absolute;");
    expect(css("fw:b")).eq("font-weight: bold;");
  });

  it("short keywords", () => {
    expect(css("dn")).eq("display: none;");
    expect(css("df")).eq("display: flex;");
  });

  it("colors", () => {
    expect(css("c#f")).eq("color: #fff;");
  });

  it("! adds !important", () => {
    expect(css("m10!")).eq("margin: 10px !important;");
  });

  it("a border shorthand", () => {
    expect(css("bd1-s#f")).eq("border: 1px solid #fff;");
  });
});

describe("actions", () => {
  it("wrapWithAbbreviation puts the text inside the element", () => {
    expect(wrapWithAbbreviation("x", "div")).eq("<div>x</div>");
  });

  it("a bare * repeats the element for each line", () => {
    expect(wrapWithAbbreviation("a\nb", "ul>li*")).eq("<ul>\n\t<li>a</li>\n\t<li>b</li>\n</ul>");
  });

  it("balanceOut grows from the tag contents to the whole tag", () => {
    const text = "<div><p>text</p></div>";
    const first = balanceOut(text, [10, 10]);

    expect(text.slice(...first)).eq("text");
    expect(text.slice(...balanceOut(text, first))).eq("<p>text</p>");
  });

  it("removeTag keeps the contents", () => {
    expect(removeTag("<div><p>x</p></div>", 9)).eq("<div>x</div>");
  });

  it("updateTag renames both the opening and the closing tag", () => {
    expect(updateTag("<p>x</p>", 1, "span")).eq("<span>x</span>");
  });

  it("splitJoinTag switches between <div></div> and <div />", () => {
    expect(splitJoinTag("<div></div>", 1)).eq("<div />");
    expect(splitJoinTag("<div />", 1)).eq("<div></div>");
  });

  it("incrementNumber by 1, 10 and -1", () => {
    expect(incrementNumber("x = 9", 5, 1)).eq("x = 10");
    expect(incrementNumber("x = 5", 5, 10)).eq("x = 15");
    expect(incrementNumber("x = 0", 5, -1)).eq("x = -1");
  });

  it("evaluateMath replaces the expression before the cursor with its value", () => {
    expect(evaluateMath("w: 2*3", 6)).eq("w: 6");
    expect(evaluateMath("10/4", 4)).eq("2.5");
  });
});

describe("in the editor", () => {
  it("expandAbbreviation expands the abbreviation before the cursor", () => {
    const ide = code("ul>li*2|", { path: "a.html" }).executeCommand("emmet.expandAbbreviation");

    expect(ide.lines()).toEqual(["<ul>", "\t<li></li>", "\t<li></li>", "</ul>"]);
  });

  it("leaves the cursor in the first empty spot", () => {
    const ide = code("p|", { path: "a.html" }).executeCommand("emmet.expandAbbreviation");

    expect(ide.state()).eq("<p>|</p>");
  });
});
