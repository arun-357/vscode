/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IDialogService, IFileDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../../platform/native/common/native.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { toWorkspaceFolder, WorkbenchState } from '../../../../../platform/workspace/common/workspace.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { IWorkspaceTrustManagementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { IEnterWorkspaceResult, IWorkspacesService } from '../../../../../platform/workspaces/common/workspaces.js';
import { IUserDataProfilesService } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IWorkbenchConfigurationService } from '../../../configuration/common/configuration.js';
import { IJSONEditingService } from '../../../configuration/common/jsonEditing.js';
import { WorkspaceService } from '../../../configuration/browser/configurationService.js';
import { INativeWorkbenchEnvironmentService } from '../../../environment/electron-browser/environmentService.js';
import { IExtensionService } from '../../../extensions/common/extensions.js';
import { IHostService } from '../../../host/browser/host.js';
import { ILifecycleService } from '../../../lifecycle/common/lifecycle.js';
import { ITextFileService } from '../../../textfile/common/textfiles.js';
import { IUserDataProfileService } from '../../../userDataProfile/common/userDataProfile.js';
import { IWorkingCopyBackupService } from '../../../workingCopy/common/workingCopyBackup.js';
import { NativeWorkspaceEditingService } from '../../electron-browser/workspaceEditingService.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { TestEnvironmentService, TestLifecycleService } from '../../../../test/browser/workbenchTestServices.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';

class TestNativeWorkspaceEditingService extends NativeWorkspaceEditingService {

	private readonly enterWorkspaceResult: IEnterWorkspaceResult;

	constructor(
		enterWorkspaceResult: IEnterWorkspaceResult,
		jsonEditingService: IJSONEditingService,
		contextService: WorkspaceService,
		nativeHostService: INativeHostService,
		configurationService: IWorkbenchConfigurationService,
		storageService: IStorageService,
		extensionService: IExtensionService,
		workingCopyBackupService: IWorkingCopyBackupService,
		notificationService: INotificationService,
		commandService: ICommandService,
		fileService: IFileService,
		textFileService: ITextFileService,
		workspacesService: IWorkspacesService,
		environmentService: INativeWorkbenchEnvironmentService,
		fileDialogService: IFileDialogService,
		dialogService: IDialogService,
		lifecycleService: ILifecycleService,
		labelService: ILabelService,
		hostService: IHostService,
		uriIdentityService: IUriIdentityService,
		workspaceTrustManagementService: IWorkspaceTrustManagementService,
		userDataProfilesService: IUserDataProfilesService,
		userDataProfileService: IUserDataProfileService,
	) {
		super(
			jsonEditingService,
			contextService,
			nativeHostService,
			configurationService,
			storageService,
			extensionService,
			workingCopyBackupService,
			notificationService,
			commandService,
			fileService,
			textFileService,
			workspacesService,
			environmentService,
			fileDialogService,
			dialogService,
			lifecycleService,
			labelService,
			hostService,
			uriIdentityService,
			workspaceTrustManagementService,
			userDataProfilesService,
			userDataProfileService,
			new NullLogService(),
		);
		this.enterWorkspaceResult = enterWorkspaceResult;
	}

	protected override async doEnterWorkspace(_workspaceUri: URI): Promise<IEnterWorkspaceResult | undefined> {
		return this.enterWorkspaceResult;
	}
}

suite('NativeWorkspaceEditingService', () => {

	const store = ensureNoDisposablesAreLeakedInTestSuite();

	const workspaceUri = URI.file('/test/Untitled-1.code-workspace');
	const enterWorkspaceResult: IEnterWorkspaceResult = {
		workspace: { id: 'test-workspace', configPath: workspaceUri }
	};

	function createService(contextService: TestContextService, extensionService: IExtensionService): TestNativeWorkspaceEditingService {
		const fileService = store.add(new FileService(new NullLogService()));
		const fileSystemProvider = store.add(new InMemoryFileSystemProvider());
		store.add(fileService.registerProvider('file', fileSystemProvider));
		const uriIdentityService = store.add(new UriIdentityService(fileService));

		return new TestNativeWorkspaceEditingService(
			enterWorkspaceResult,
			new class extends mock<IJSONEditingService>() { },
			contextService as unknown as WorkspaceService,
			new class extends mock<INativeHostService>() { },
			new class extends mock<IWorkbenchConfigurationService>() { },
			new class extends mock<IStorageService>() {
				override switch() { return Promise.resolve(); }
			},
			extensionService,
			new class extends mock<IWorkingCopyBackupService>() { },
			new class extends mock<INotificationService>() { },
			new class extends mock<ICommandService>() { },
			fileService,
			new class extends mock<ITextFileService>() { },
			new class extends mock<IWorkspacesService>() { },
			TestEnvironmentService as unknown as INativeWorkbenchEnvironmentService,
			new class extends mock<IFileDialogService>() { },
			new class extends mock<IDialogService>() { },
			store.add(new TestLifecycleService()),
			new class extends mock<ILabelService>() { },
			new class extends mock<IHostService>() { },
			uriIdentityService,
			new class extends mock<IWorkspaceTrustManagementService>() { },
			new class extends mock<IUserDataProfilesService>() { },
			new class extends mock<IUserDataProfileService>() { },
		);
	}

	test('enterWorkspace from empty window does not restart extension host', async () => {
		const contextService = new TestContextService(new Workspace('empty-workspace'));
		assert.strictEqual(contextService.getWorkbenchState(), WorkbenchState.EMPTY);

		let stopExtensionHostsCalls = 0;
		let startExtensionHostsCalls = 0;
		const extensionService = new class extends mock<IExtensionService>() {
			override stopExtensionHosts() {
				stopExtensionHostsCalls++;
				return Promise.resolve(true);
			}
			override startExtensionHosts() {
				startExtensionHostsCalls++;
				return Promise.resolve();
			}
		};

		const service = store.add(createService(contextService, extensionService));
		await service.enterWorkspace(workspaceUri);

		assert.strictEqual(stopExtensionHostsCalls, 0);
		assert.strictEqual(startExtensionHostsCalls, 0);
	});

	test('enterWorkspace from folder window restarts extension host', async () => {
		const contextService = new TestContextService(new Workspace('folder-workspace', [toWorkspaceFolder(URI.file('/test/folder'))]));
		assert.strictEqual(contextService.getWorkbenchState(), WorkbenchState.FOLDER);

		let stopExtensionHostsCalls = 0;
		let startExtensionHostsCalls = 0;
		const extensionService = new class extends mock<IExtensionService>() {
			override stopExtensionHosts() {
				stopExtensionHostsCalls++;
				return Promise.resolve(true);
			}
			override startExtensionHosts() {
				startExtensionHostsCalls++;
				return Promise.resolve();
			}
		};

		const service = store.add(createService(contextService, extensionService));
		await service.enterWorkspace(workspaceUri);

		assert.strictEqual(stopExtensionHostsCalls, 1);
		assert.strictEqual(startExtensionHostsCalls, 1);
	});
});
