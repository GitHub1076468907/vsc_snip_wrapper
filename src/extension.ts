import { close } from 'inspector';
import path = require('path');
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

var fs = require('fs');
const chokidar = require('chokidar')

const json_str = {snip_demo :{"prefix": "","body": [],"description":"" }};
var tmp = JSON.stringify(json_str);
var res_json = JSON.parse(tmp);//将字符串转换为json对象
const directoryPath = path.resolve(__dirname, '../custom/snippets_cfg.json');

function readAndWriteAllJson(path_list: any, num: number){
	if (num >= path_list.length){
		return;
	}
	var item = path_list[num];
	//现将json文件读出来
    fs.readFile(item, function (err: any, data: { toString: () => any; }) {
        if (err) {
			vscode.window.showErrorMessage(err.message);
			return;
        }
        var person = data.toString(); //将二进制的数据转换为字符串
        person = JSON.parse(person);
        for (var js2 in person) {
            res_json[js2] = person[js2];
        }
        num = num + 1;
        if (num >= path_list.length) {
            var str = JSON.stringify(res_json, null, 2); //因为nodejs的写入文件只认识字符串或者二进制数，所以把json对象转换成字符串重新写入json文件中
            fs.writeFile(directoryPath, str, function (err: any) {
                if (err) {
					vscode.window.showErrorMessage(err.message);
					return;
                }
                vscode.window.showInformationMessage('restart vscode to active snip change');
            });
        }
        else {
            readAndWriteAllJson(path_list, num);
        }
    });
}

function fillter_pre_url(params:string) {
	var length = params.length;
	var i = params.indexOf(":", 2);
	if(i > 0){
		params = params.substring(i - 1);
	}
	return params;
}

//combine  custom_cfg and json_custom_url json
function writeJson(setting_path: any){
	const custom_path = path.resolve(__dirname, '../custom/custom_cfg.json');
	var arr = setting_path.toString().split(";");
	var path_list = [];
	path_list.push(custom_path);
	for (var i = 0; i < arr.length; i++) {
		if(arr[i] != ""){
			const tmp = fillter_pre_url(path.resolve(arr[i]));
			path_list.push(tmp);
		}
	}
	console.log("path_list",path_list);
	readAndWriteAllJson(path_list, 0);
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "snippets" is now active!');

	let disposable2 = vscode.commands.registerCommand('snippets.edit_custom_snip', (uri) => {
		const directoryPath = path.resolve(__dirname, '../custom/custom_cfg.json');

		vscode.workspace.openTextDocument(directoryPath).then((document: vscode.TextDocument) => {
			vscode.window.showTextDocument(document, 1, false);
		})
	});

	context.subscriptions.push(disposable2);

	let disposable = vscode.commands.registerCommand('snippets.import_snip_file_url', (uri) => {
		const port = vscode.workspace.getConfiguration("snippets").get<string>('json_custom_url');
		//writeJson(port);

		vscode.window.showInputBox(
			{ // 这个对象中所有参数都是可选参数
				value : port,
				placeHolder : "",
				ignoreFocusOut:true, // 默认false，设置为true时鼠标点击别的地方输入框不会消失
                prompt:'put your custom snip_config json file url,  multiple paths use ";" separate', // 在输入框下方的提示信息
            }).then( result => {
				if ( result === undefined) return;
				vscode.workspace.getConfiguration("snippets").update('json_custom_url', result, true)
			}
			);
	});

	context.subscriptions.push(disposable);

	let time : number | undefined =  vscode.workspace.getConfiguration("snippets")!.get<number>('save_custom_limit_time');

	//监听配置变化
	vscode.workspace.onDidChangeConfiguration(function(event) {
	  const configList = ['snippets.json_custom_url'];
	  // affectsConfiguration: 判断是否变更了指定配置项
	  const affected = configList.some(item => event.affectsConfiguration(item));
	  if (affected) {
		  	//配置变化的时候再变更一下
			const port = vscode.workspace.getConfiguration("snippets").get<string>('json_custom_url');
			writeJson(port);
	  }
	});

	//监听配置变化
	vscode.workspace.onDidChangeConfiguration(function(event) {
		  const configList = ['snippets.save_custom_limit_time'];
		  // affectsConfiguration: 判断是否变更了指定配置项
		  const affected = configList.some(item => event.affectsConfiguration(item));
		  if (affected) {
			  	//配置变化的时候再变更一下
				time =  vscode.workspace.getConfiguration("snippets")!.get<number>('save_custom_limit_time');
		  }
		});
	

	const directoryPath = path.resolve(__dirname, '../custom/custom_cfg.json');
	var old_event: { ctimeMs: number; };
	chokidar.watch(directoryPath).on('change', (path: any, event: any) => {//监听除了ready, raw, and error之外所有的事件类型
		if (old_event && old_event.ctimeMs && event.ctimeMs - old_event.ctimeMs <= (time as any)){
			vscode.window.showInformationMessage('Please do not save repeatedly within ' + time?.toString() + 'ms');
			return;
		}
		old_event = event;
		vscode.window.showInformationMessage('start update_snip_cfg');
		//配置变化的时候再变更一下
		const port = vscode.workspace.getConfiguration("snippets").get<string>('json_custom_url');
		writeJson(port);
	});

}

// this method is called when your extension is deactivated
export function deactivate() {}
