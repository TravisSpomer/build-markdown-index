import fs from "node:fs/promises"
import path from "node:path"
import FrontMatter from "front-matter"
import MarkdownIt from "markdown-it"
import SanitizeHtml from "sanitize-html"

// Usage:
// node index.mjs [input [output]]

// The source path passed on the command line, or fall back to the current directory if it's not present.
const rootDir = process.argv[2] || process.cwd()
// The destination path passed on the command line, or search-index.json if not specified.
const outFile = process.argv[3] || "search-index.json"

console.log("Building Markdown index from:")
console.log(`    ${rootDir}`)
console.log()

const index = []

const markdownConverter = MarkdownIt({
	html: true,
	linkify: true,
	quotes: "“”‘’",
	typographer: true,
})

await indexFolder(index, rootDir, "/")
await fs.writeFile(outFile, JSON.stringify(index), { encoding: "utf-8" })

console.log()
console.log("Done! Saved to:")
console.log(`    ${outFile}`)
console.log()

// ----------

async function indexFolder(index, dir, prefix)
{
	console.log(prefix)
	const recurse = []
	for (const item of await fs.readdir(dir, { withFileTypes: true }))
	{
		const localPath = path.join(dir, item.name)
		const pathParts = path.parse(item.name)
		if (item.isDirectory())
		{
			recurse.push([localPath, prefix + item.name + "/"])
		}
		else if (pathParts.ext === ".md")
		{
			console.log(`    ${pathParts.name}`)
			const contents = await fs.readFile(localPath, { encoding: "utf-8" })
			const fm = FrontMatter(contents)
			const properties = fm.attributes
			delete properties.layout
			delete properties.seealso
			index.push({
				...properties,
				path: prefix + pathParts.name,
				body: SanitizeHtml(markdownConverter.render(fm.body), { allowedTags: [], allowedAttributes: {} }),
			})
		}
	}
	for (const dir of recurse)
	{
		await indexFolder(index, ...dir)
	}
}
