import * as vscode from 'vscode';

export default async () => {
  const uri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    openLabel: 'Select Folder',
    title: 'Select Api folder'
  });

  if (uri && uri?.length > 0) {
    console.log(uri[0].toString());
    console.log(uri[0].toJSON());

    if (process.platform === 'win32') {
      return uri[0].toJSON().path.slice(1); // slice(1) removes a starting / that is placed at the start of the path, ex: /C:/path/to/place
    } else {
      return uri[0].toJSON().path; // root paths in non windows machines should start with '/'
    }
  }
  throw Error('Api folder Uri not found');
};
