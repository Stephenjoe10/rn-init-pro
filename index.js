#!/usr/bin/env node

import inquirer from 'inquirer';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from "ora"

// =============================
// 🚀 PROGRESS SYSTEM
// =============================

let spinner = ora({
	spinner: "dots",
	color: "green"
})

const startTask = (text) => {
	spinner.start(text)
}

const succeedTask = (text) => {
	spinner.succeed(text)
}

const failTask = (text) => {
	spinner.fail(text)
}

const updateTask = (text) => {
	spinner.text = text
}

// =============================
// 🧠 MAIN CLI
// =============================
const run = async () => {
	const answers = await inquirer.prompt([
		{ type: 'input', name: 'projectName', message: 'Project name?', default: 'MyApp' },
		{ type: 'confirm', name: 'reanimated', message: 'Install Reanimated?' },
		{
			type: 'checkbox',
			name: 'navigation',
			message: 'Select navigation',
			choices: ['stack', 'drawer', 'bottom-tabs', 'top-tabs'],
		},
		{ type: 'confirm', name: 'vectorIcons', message: 'Install vector icons?' },
		{ type: 'confirm', name: 'fonts', message: 'Setup custom fonts?' },
	]);

	const project = answers.projectName;

	const install = async (deps) => {
		if (!deps.length) return;

		startTask(`Installing ${deps.length} package(s)...`);

		updateTask(`Installing: ${deps.join(', ')}`);
		await execa('npm', ['install', ...deps], {
			cwd: project,
			stdio: 'inherit',
		});

		succeedTask('Dependencies installed');
	};

	try {
		// =============================
		startTask('Creating React Native project...');

		await execa(
			'npx',
			['--yes', '@react-native-community/cli', 'init', project],
			{ stdio: 'inherit' }
		);

		succeedTask('React Native project created  🎉');

		// =============================
		if (answers.navigation.length > 0) {
			startTask('Setting up navigation...');
			updateTask('Installing navigation core...');

			await install([
				'@react-navigation/native',
				'react-native-screens',
				'react-native-safe-area-context',
				'react-native-gesture-handler',
				'react-native-reanimated',
				'react-native-worklets',
			]);

			if (answers.navigation.includes('stack')) {
				updateTask('Installing stack navigator...');
				await install(['@react-navigation/native-stack']);
			}
			if (answers.navigation.includes('drawer')) {
				updateTask('Installing drawer navigator...');
				await install(['@react-navigation/drawer']);
			}
			if (answers.navigation.includes('bottom-tabs')) {
				updateTask('Installing bottom tab navigator...');
				await install(['@react-navigation/bottom-tabs']);
			}
			if (answers.navigation.includes('top-tabs')) {
				updateTask('Installing top tab navigators...');
				await install([
					'@react-navigation/material-top-tabs',
					'react-native-tab-view',
				]);
			}

			succeedTask('Navigation configured 🎉');
		}

		// =============================
		if (answers.reanimated || answers.navigation.length > 0) {
			startTask('Configuring Reanimated...');

			const babelPath = path.join(project, 'babel.config.js');
			let babel = await fs.readFile(babelPath, 'utf-8');

			if (!babel.includes('react-native-reanimated/plugin')) {

				updateTask('Updating Babel configuration...');

				if (babel.includes('plugins:')) {
					// ✅ Case 1: plugins already exists
					babel = babel.replace(
						/plugins:\s*\[([\s\S]*?)\]/,
						(match, p1) => {
							const plugins = p1.trim();
							return plugins
								? `plugins: [${plugins}, 'react-native-reanimated/plugin']`
								: `plugins: ['react-native-reanimated/plugin']`;
						}
					);

				} else {
					// ✅ Case 2: plugins does NOT exist
					babel = babel.replace(
						/module\.exports\s*=\s*{/,
						`module.exports = {\n  plugins: ['react-native-reanimated/plugin'],`
					);
				}
			}

			await fs.writeFile(babelPath, babel);

			succeedTask('Reanimated configured 🎉');
		}
		// =============================
		if (answers.vectorIcons) {
			startTask('Setting up vector icons...');
			updateTask('Installing vector icons...');

			await install(['react-native-vector-icons']);
			await execa('npm', ['install', '-D', '@types/react-native-vector-icons'], {
				cwd: project,
				stdio: 'ignore',
			});

			const gradlePath = path.join(project, 'android/app/build.gradle');
			let gradle = await fs.readFile(gradlePath, 'utf-8');

			if (!gradle.includes('vector-icons')) {
				updateTask('Linking fonts to Android...');
				gradle += '\napply from: "../../node_modules/react-native-vector-icons/fonts.gradle"\n';
			}

			await fs.writeFile(gradlePath, gradle);

			succeedTask('Vector icons configured 🎉');
		}

		// =============================
		if (answers.fonts) {
			startTask('Preparing custom fonts...');
			updateTask('Creating fonts directory...');

			const fontsPath = path.join(project, 'assets/fonts');
			await fs.ensureDir(fontsPath);

			const config = `
module.exports = {
  assets: ['./assets/fonts'],
};
`;

			updateTask('Generating React Native config...');
			await fs.writeFile(
				path.join(project, 'react-native.config.js'),
				config
			);

			succeedTask('Fonts configured 🎉');
		}

		// =============================
		if (answers.navigation.length > 0) {
			startTask('Configuring gesture handler...');

			const indexPath = path.join(project, 'index.js');
			let indexFile = await fs.readFile(indexPath, 'utf-8');

			if (!indexFile.includes('gesture-handler')) {
				indexFile = "import 'react-native-gesture-handler';\n" + indexFile;
			}

			await fs.writeFile(indexPath, indexFile);

			succeedTask('Gesture handler configured 🎉');
		}

		// =============================
		startTask('Installing iOS dependencies...');

		try {
			await execa('npx', ['pod-install'], {
				cwd: project,
				stdio: 'inherit',
			});
			succeedTask('iOS dependencies installed');
		} catch {
			failTask('Skipped iOS setup');
		}

		// =============================
		startTask('Finalizing project setup...');
		await new Promise((res) => setTimeout(res, 800));

		succeedTask('Project setup completed 🎉');

		console.log(chalk.green('\n🎉 Project ready!\n'));

		console.log(chalk.cyan('👉 Next steps:\n'));

		console.log(chalk.white(`  cd ${project}`));

		console.log(chalk.cyan('\n📱 Run your app:\n'));
		console.log(chalk.yellow('  npx react-native run-android'));
		console.log(chalk.yellow('  npx react-native run-ios'));

		if (answers.fonts) {
			console.log(chalk.cyan('\n🔤 Custom fonts:\n'));

			console.log(chalk.white('  1. Add fonts to:'));
			console.log(chalk.gray(`     ${project}\\assets\\fonts`));

			console.log(chalk.white('\n  2. Run:'));
			console.log(chalk.yellow('     npx react-native-asset'));
		}

		console.log(chalk.gray('\nHappy coding! 🚀\n'));
	} catch (err) {
		failTask('Failed to configure..');
	}
};

run();