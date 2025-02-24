import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IJobContext, IProcessor } from '@rocket.chat/apps-engine/definition/scheduler';
import { SpotifyAppApp } from '../SpotifyAppApp';
import { REFRESH_TOKEN_ID } from '../constants/constants';
import { GetToken } from '../helpers/getToken';


export class tokenRefreshJob {
	constructor(private app: SpotifyAppApp) {
    }

	public getSpotifyTokenRefresh(): IProcessor {
		const job: IProcessor = {
			id: REFRESH_TOKEN_ID,
			processor: this.processor.bind(this)
		};
		return job;
	}

	private async processor(jobContext: IJobContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence) {
        this.app.getLogger().log('Refreshing token job');
        const tokenGetter = new GetToken();
        await tokenGetter.refreshToken(this.app, read, modify, http, persis, jobContext.data.request.query.state);
	}
}