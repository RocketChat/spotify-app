import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IPersistence, IPersistenceRead, IRead, IRoomRead, IHttp, IModify } from '@rocket.chat/apps-engine/definition/accessors';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export class AppPersistence {
    constructor(private readonly persistence: IPersistence, private readonly persistenceRead: IPersistenceRead, private readonly read: IRead) { }

    public async link_user_to_token(user: IUser, token: string): Promise<void> {
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        await this.persistence.createWithAssociation({
            id: user.id,
            token: token,
        }, association);
    }

    public async update_token(id: string, accessToken: string) {
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, id);
        await this.persistence.updateByAssociation(association, {
            id: id,
            token: accessToken,
        });
    }

    public async get_token(user: string): Promise<string> {
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user);
        const persistedData = await this.read.getPersistenceReader().readByAssociation(association);
        const token = persistedData.length > 0 ? (persistedData[0] as any).token : null;
        return token;
    }

    public async does_user_have_token(user: string): Promise<boolean> {
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user);
        const persistedData = await this.read.getPersistenceReader().readByAssociation(association);
        const token = persistedData.length > 0 ? (persistedData[0] as any).token : null;
        if(token != null) {
            return true;
        }
        return false;
    }
}