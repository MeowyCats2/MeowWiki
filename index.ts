import express from "express";
import multer from "multer";
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import cookieParser from "cookie-parser"
import url from "node:url";
import crypto from "node:crypto";
import { mfetch, send_file, edit_msg } from "./webhook.ts";
const upload = multer();

TimeAgo.addLocale(en)
const timeAgo = new TimeAgo("en-US")

const app = express();
const port = 8080;

app.use(upload.array()); 
app.use(cookieParser())

const generatePage = (req, title, content, lastUpdated) => {
	const user = Object.entries(accounts).find(([name, data]) => data.token === crypto.createHash("sha256").update(req.cookies.token).digest("hex"))
	return `<!DOCTYPE html>
<html>
<head>
  <title>Wiki</title>
  <link rel="stylesheet" href="https://en.wikipedia.org/w/load.php?lang=en&modules=ext.DarkMode.styles%7Cext.MobileDetect.mobileonly%7Cext.echo.styles.badge%7Cext.visualEditor.desktopArticleTarget.noscript%7Cmediawiki.page.gallery.styles%7Coojs-ui.styles.icons-alerts%7Cskins.vector.styles.legacy&only=styles&skin=vector">
  <style>
    .mw-wiki-logo {
	  background: white;
	}
  </style>
</head>

<body class="skin-vector-legacy mediawiki ltr sitedir-ltr mw-hide-empty-elt">
  <div id="mw-page-base" class="noprint"></div>
  <div id="mw-head-base" class="noprint"></div>
  <div id="content" class="mw-body ve-init-mw-desktopArticleTarget-targetContainer" role="main">
	<div class="mw-indicators">
		<div id="mwe-lastmodified">
			${lastUpdated}
		</div>
	</div>
	<h1 id="firstHeading" class="firstHeading mw-first-heading">${title}</h1>
	<div id="bodyContent" class="vector-body"></div>
	<div id="mw-content-text" class="mw-body-content mw-content-ltr" lang="en" dir="ltr">
		${content}
	</div>
  </div>
  <div id="mw-navigation">
	<h2>Navigation menu</h2>
	<div id="mw-head">
		<nav id="p-personal" class="vector-menu mw-portlet mw-portlet-personal vector-user-menu-legacy" aria-labelledbu="p-personal-label" role="navigation">
			<h3 id="p-personal-label" class="vector-menu-heading">
				<span class="vector-menu-heading-label">Personal tools</span>
			</h3>
			<div class="vector-menu-content">
				<ul class="vector-menu-content-list">
					${user ? `<li id="pt-userpage"><a href="/User:${user[0]}">${user[0]}</a></li>` : `<li><a href="/Special:Login">Login</a></li>
					<li><a href="/Special:Register">Register</a></li>`}
				</ul>
			</div>
		</nav>
		<div id="left-navigation">
			<nav id="p-namespaces" class="vector-menu mw-portlet mw-portlet-namespaces vector-menu-tabs vector-menu-tabs-legacy" aria-labelledby="p-namespaces-label" role="navigation">
				<h3 id="p-namespaces-label" class="vector-menu-heading">
					<span class="vector-menu-heading-label">Namespaces</span>
				</h3>
				<div class="vector-menu-content">
					<ul class="vector-menu-content-list">
						<li id="ca-nstab-main" class="${req.url.includes("Talk:") ? "" : "selected "}mw-list-item">
							<a href="${req.url.replace("Talk:", "")}"><span>Main</span></a>
						</li>
						<li id="ca-talk" class="${req.url.includes("Talk:") ? "selected " : ""}mw-list-item">
							<a href="./Talk:${req.url.split("/").at(-1)}"><span>Talk</span></a>
						</li>
					</ul>
				</div>
			</nav>
		</div>
		<div id="right-navigation">
			<nav id="p-views" class="vector-menu mw-portlet mw-portlet-views vector-menu-tabs vector-menu-tabs-legacy" aria-labelledby="p-views-label" role="navigation">
				<h3 id="p-views-label" class="vector-menu-heading">
					<span class="vector-menu-heading-label">Views</span>
				</h3>
				<div class="vector-menu-content">
					<ul class="vector-menu-content-list">
						<li id="ca-view" class="${req.query.action ? "" : "selected "}mw-list-item collapsible">
							<a href="${url.parse(req.url).pathname}"><span>Read</span></a>
						</li>
						<li id="ca-edit" class="${req.query.action === "edit" ? "selected " : ""}collapsible mw-list-item">
							<a href="${url.parse(req.url).pathname}?action=edit"><span>Edit</span></a>
						</li>
						<li id="ca-history" class="${req.query.action === "history" ? "selected " : ""}collapsible mw-list-item">
							<a href="${url.parse(req.url).pathname}?action=history"><span>History</span></a>
						</li>
					</ul>
				</div>
			</nav>
		</div>
	</div>
	<div id="mw-panel" class="vector-legacy-sidebar">
		<div id="p-logo" role="banner">
			<a href="/" class="mw-wiki-logo" title="Visit the main page"></a>
		</div>
		<nav id="p-nevigation" class="vector-menu mw-portlet mw-portlet-navigation vector-menu-portal portal" aria-labelledby="p-navigation-label" role="navigation">
			<h3 id="p-navigation-label" class="vector-menu-heading">
				<span class="vector-menu-heading-label">Navigation</span>
			</h3>
			<div class="vector-menu-content">
				<ul class="vector-menu-content-list">
					<li id="n-mainpage-description" class="mw-list-item">
						<a href="/"><span>Main page</span></a>
					</li>
				</ul>
			</div>
		</nav>
	</div>
  </div>
  <footer id="footer" class="mw-footer" role="contentinfo">
    The Vector skin is licensed under "GNU General Public License 2.0 or later".
  </footer>
</body>
</html>`
}

const generateReadPage = (req, title, content, lastUpdated) => generatePage(req, title, `<div class="mw-parser-output">${content}</div>`, lastUpdated)

const generateEditPage = (req, title, content, lastUpdated) => generatePage(req, `Editing <span id="firstHeadingTitle">${title}</span>`, `
<form class="mw-editform" id="editform" name="editform" method="post" action="${url.parse(req.url).pathname}?action=submit" enctype="multipart/form-data">
	<textarea class="mw-editfont-monospace" id="wpTextbox1" cols="80" rows="25" lang="en" dir="ltr" name="wpTextbox1">${content}</textarea>
	<div class="editOptions">
		<div id="wpSummaryLabel" class="mw-summary oo-ui-layout oo-ui-labelElement oo-ui-fieldLayout oo-ui-fieldLayout-align-top">
			<div class="oo-ui-fieldLayout-body">
				<span class="oo-ui-fieldLayout-header">
					<label for="wpSummary" class="oo-ui-labelElement-label">Summary:</label>
				</span>
				<div class="oo-ui-fieldLayout-field">
					<div id="wpSummaryWidget" class=oo-ui-widget oo-ui-widget-enabled oo-ui-inputWidget oo-ui-textInputWidget oo-ui-textInputWidget-type-text" data-ooui>
						<input type="text" name="wpSummary" id="wpSummary" spellcheck="true" class="ui-inputWidget-input"
					</div>
				</div>
			</div>
		</div>
		<div class="editButtons">
			<span id="wpSaveWidget" class="oo-ui-widget oo-ui-widget-enabled oo-ui-inputWidget oo-ui-buttonElement oo-ui-buttonElement-framed oo-ui-labelElement oo-ui-flaggedElement-progressive oo-ui-flaggedElement-primary oo-ui-buttonInputWidget">
				<input type="submit" name="wpSave" id="wpSave" value="Save changes" class="oo-ui-inputWidget-input oo-ui-buttonElement-button"></input>
			</div>
		</div>
	</div>
</form>
`, lastUpdated)

let pages = {}
let accounts = {}

app.get("/", (req, res) => {
	res.redirect("/Main_Page")
})
app.get("/:page", (req, res) => {
	const lastUpdated = req.params.page in pages ? "Last updated " + timeAgo.format(new Date(pages[req.params.page].date)) : ""
	if (req.params.page.startsWith("Special:")) {
		if (req.params.page === "Special:Login") return res.send(generateReadPage(req, "Login", `
		<form method="POST" action="${req.url}" enctype="multipart/form-data">
		<label for="username">Username</label>
		<input type="text" name="username" id="username">
		<br/>
		<label for="password">Password</label>
		<input type="text" name="password" id="password">
		<br/>
		<input type="submit" value="submit">
		</form>
		`, ""))
		if (req.params.page === "Special:Register") return res.send(generateReadPage(req, "Register", `
<form method="POST" action="${req.url}" enctype="multipart/form-data">
<label for="username">Username</label>
<input type="text" name="username" id="username">
<br/>
<label for="password">Password</label>
<input type="text" name="password" id="password">
<br/>
<input type="submit" value="submit">
</form>
`, ""))
		return
	}
	if (!req.query.action) return res.send(generateReadPage(req, req.params.page.replaceAll("_", " "), req.params.page in pages ? pages[req.params.page].content.replace(/\[\[(.+?)\]\]/g, (text, content) => {
	let destination = null;
	let show = null;
	if (content.includes("|")) {
		destination = content.split("|")[0].replaceAll(" ", "_")
		show = content.split("|")[1]
	} else {
		destination = content.replaceAll(" ", "_")
		show = content
	}
	return `<a href="/${destination}"${!(destination in pages) ? ` class="new"` : ""}>${show}</a>`
	}): "No content.", lastUpdated));
	if (req.query.action === "edit") return res.send(generateEditPage(req, req.params.page.replaceAll("_", " "), req.params.page in pages ? (req.query.revision ? pages[req.params.page].history[req.query.revision].content : pages[req.params.page].content) : "", lastUpdated));
	if (req.query.action === "history") return res.send(generatePage(req, req.params.page.replaceAll("_", " "), req.params.page in pages ? `<section id="pagehistory" class="mw-pager-body">
	<ul class="mw-contributions-list">
	${pages[req.params.page].history.map((revision, index) => `
		<li class="mw-tag-wikieditor before">
			<span class="mw-changeslist-time">${revision.date}</span> <span class="mw-changeslist-seperator"></span> <span class="comment comment--without-parentheses">${revision.summary}</span> <span class="mw-changeslist-seperator"></span> <span class="history-user"><a href="/User:${revision.user}"${("User:" + revision.user) in pages ? "" : ` class="new"`}>${revision.user}</a></span> <span class="mw-changeslist-links mw-pager-tools"><span><a href="${url.parse(req.url).pathname}?action=edit&revision=${index}">revert to here</a>
</span></span>
		</li>

`).join("<br/>")}` : "</ul></section>", lastUpdated));
	return res.send(generateReadPage(req, "Error", "Invalid action.", ""))
});

app.post("/:page", async (req, res) => {
	if (req.params.page.startsWith("Special:")) {
		if (req.params.page === "Special:Login") {
			if (!accounts[req.body.username]) return res.send(generateReadPage(req, "Login", "Invalid username", ""))
			if (accounts[req.body.username].password !== crypto.createHash("sha256").update(req.body.password).digest("hex")) return res.send(generateReadPage(req, "Login", "Invalid password", ""))
			const token = Math.random() + ""
			accounts[req.body.username].token = crypto.createHash("sha256").update(token).digest("hex")
			await saveToDB()
			return res.set("Set-Cookie", "token=" + token).send(generateReadPage(req, "Login", "Success", ""))
		}
		if (req.params.page === "Special:Register") {
			const token = Math.random() + ""
			accounts[req.body.username] = {
				"password": crypto.createHash("sha256").update(req.body.password).digest("hex"),
				"token": crypto.createHash("sha256").update(token).digest("hex")
			}
			await saveToDB()
			return res.set("Set-Cookie", "token=" + token).send(generateReadPage(req, "Register", "Success", ""))
		}
	}
	if (req.query.action === "submit") {
		console.log(req.body)
		const user = Object.entries(accounts).find(([name, data]) => data.token === crypto.createHash("sha256").update(req.cookies.token).digest("hex"))
		if (!user) return res.send(generateReadPage(req, "Editing failed", "You need to be logged in.", ""))
		const username = user[0]
		if (req.params.page in pages) {
			pages[req.params.page] = {
				"date": new Date() + "",
				"content": req.body.wpTextbox1,
				"history": [{"date": new Date() + "", "content": req.body.wpTextbox1, "user": username, "summary": req.body.wpSummary}, ...pages[req.params.page].history]
			}
		} else {
			pages[req.params.page] = {
				"date": new Date() + "",
				"content": req.body.wpTextbox1,
				"history": [{"date": new Date() + "", "content": req.body.wpTextbox1, "user": username, "summary": req.body.wpSummary}]
			}
		}
		await saveToDB()
		return res.redirect(303, url.parse(req.url).pathname)
	}
})
app.listen(port, () => {
	console.log(`Listening on port ${port}...`);
});

const saveToDB = async () => await edit_msg(process.env.message, new Blob([JSON.stringify({pages, accounts})]), "wiki.json")

if (!process.env.message) {
	const message = await send_file(new Blob([JSON.stringify({
		pages: {},
		accounts: {}
	})]), "wiki.json");
	console.log(message.id)
} else {
	const msg = (await (await mfetch(process.env.webhook + "/messages/" + process.env.message, {"cache": "no-store"})).json())
	const data = await (await mfetch(msg.attachments[0].url)).json()
	pages = data.pages
	accounts = data.accounts
}