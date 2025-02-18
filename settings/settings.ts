import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';

export const settings: Array<ISetting> = [
	{
		id: 'workspace url',
		type: SettingType.STRING,
		packageValue: 'URL',
		required: true,
		public: true,
		i18nLabel: 'Workspace Url',
		i18nDescription: `Please enter your workspace URL`,
	},
    {
		id: 'client id',
		type: SettingType.STRING,
		packageValue: 'Spotify Client ID',
		required: true,
		public: true,
		i18nLabel: 'Spotify Client ID',
		i18nDescription: `Please enter your Spotify Client ID`,
	},
    {
		id: 'client secret',
        //hides the value in the settings
		type: SettingType.PASSWORD,
		packageValue: 'Spotify Client Secret',
		required: true,
		public: true,
		i18nLabel: 'Spotify Client ID',
		i18nDescription: `Please enter your Spotify Client Secret`,
	}
];