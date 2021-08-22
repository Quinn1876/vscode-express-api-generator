// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import getRouteTypes from './getRouteTypes';
import selectApiFolder from './selectApiFolder';
import * as workspaceStateKeys from './workspace-state-keys';
import * as fs from 'fs/promises';
import * as path from 'path';

const camelize = (s: string) => s.replace(/-./g, x=>x.toUpperCase()[1]);
const kabobize = (w: string) => w.replace(/((?<=[a-z\d])[A-Z]|(?<=[A-Z\d])[A-Z](?=[a-z]))/g, '-$1').toLowerCase();

const getHttpCommandTypeFromRoute = (route: string) => {
	switch(route) {
	case 'get-by-id':
		return `get('/:id', ${camelize(route)})`;
	case 'get-all':
		return `get('/', ${camelize(route)})`;
	case 'add':
		return `post('/', ${camelize(route)})`;
	case 'update':
		return `patch('/:id', ${camelize(route)})`;
	case 'del':
		return `delete('/:id', ${camelize(route)})`;
	}
	throw Error('unknown route');
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "express-api-generator" is now active!');

	let selectApiFolderCommand = vscode.commands.registerCommand('express-api-generator.selectApiFolder', async () => {
		try {
			const apiFolder = await selectApiFolder();
			await context.workspaceState.update(workspaceStateKeys.API_FOLDER, apiFolder);
		} catch (err) {
			console.error(err);
		}
	});

	let createApiRouteCommand = vscode.commands.registerCommand('express-api-generator.createApiRoute', async () => {
		try {
			// If this is the first time calling the function, the api folder may need to be specified
			let apiFolder = await context.workspaceState.get(workspaceStateKeys.API_FOLDER) as string;
			if (!apiFolder) {
				apiFolder = await selectApiFolder();
				await context.workspaceState.update(workspaceStateKeys.API_FOLDER, apiFolder);
			}

			// Get the name of the route
			const apiRouteName = (await vscode.window.showInputBox({
				title: 'Enter Api Route Name',
				placeHolder: 'exampleRoute',
				validateInput: (value) => {
					if (value.trim().includes(' ')) {
						return 'Route name cannot include a space';
					}
					return undefined;
				}
			}))?.trim(); // Trim the output if it is a string
			if (!apiRouteName) {
				throw Error('Route name is blank');
			}

			let chosenRoutes = await getRouteTypes();
			console.log(chosenRoutes);

			// Create the Directory to hold the route files
			await fs.mkdir(path.join(apiFolder, apiRouteName));
			console.log('Route directory made');

			// Create all of the files for the routes
			// const wsedit = new vscode.WorkspaceEdit();
			const promises: Promise<any>[] = [];
			chosenRoutes.forEach((route) => {
				const filePath = path.join(apiFolder, apiRouteName, `${route}.js`);
				// wsedit.createFile(filePath, {
				// 	ignoreIfExists: true,
				// });
				promises.push(fs.writeFile(filePath,
`import db from '../../db';

export default (req, res) => {

};

`
					));
				});
				await Promise.all(promises);

				// Create the index.js file
				await fs.writeFile(path.join(apiFolder, apiRouteName, 'index.js'),
`import express from 'express';

${chosenRoutes.map(route => `import ${camelize(route)} from './${route}'\n`).reduce((acc, cur) => acc + cur, '')}

const router = express.Router();

${chosenRoutes.map(route => `router.${getHttpCommandTypeFromRoute(route)}\n`).reduce((acc, cur) => acc + cur, '')}

export default router;
`
			);
			const apiFolderIndexJs = path.join(apiFolder, 'index.js')
			const rootIndexFileContentsBuffer = await fs.readFile(apiFolderIndexJs);
			const rootIndexFileContents = rootIndexFileContentsBuffer.toString();

			const insertImportLocation = rootIndexFileContents.indexOf('\n', rootIndexFileContents.lastIndexOf('import'));
			const [imports, restOfFile] = [rootIndexFileContents.slice(0, insertImportLocation+1), rootIndexFileContents.slice(insertImportLocation, rootIndexFileContents.length)];

			const insertRouteLocation = restOfFile.indexOf('export default');
			const [middleOfFile, exportStatement] = [restOfFile.slice(0, insertRouteLocation), restOfFile.slice(insertRouteLocation, restOfFile.length)];

			await fs.writeFile(apiFolderIndexJs,
				`${imports}import ${apiRouteName} from './${apiRouteName}';${middleOfFile}
router.use('/${kabobize(apiRouteName)}', ${apiRouteName});
${exportStatement}

`
			);

			vscode.window.showInformationMessage(`Route: ${apiRouteName} added`);
		} catch (err) {
			console.error(err);
			vscode.window.showErrorMessage(err);
		}
	});

	context.subscriptions.push(selectApiFolderCommand);
	context.subscriptions.push(createApiRouteCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}
