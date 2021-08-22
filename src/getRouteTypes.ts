import * as vscode from 'vscode';

const routeTypes = [
  'get-all',
  'get-by-id',
  'update',
  'add',
  'del',
] as const;

export default async () => {
  const chosenRoutes = await vscode.window.showQuickPick(routeTypes, {
    canPickMany: true
  });
  if (chosenRoutes && chosenRoutes.length > 0) {
    return chosenRoutes;
  }
  throw Error('No Routes Chosen');
};
