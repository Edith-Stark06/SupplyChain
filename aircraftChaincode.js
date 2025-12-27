'use strict';

const crypto = require('crypto');

class AircraftChaincode {

    async recordPart(ctx, partId, hashValue, eventType) {

        const partRecord = {
            partId: partId,
            hash: hashValue,
            event: eventType,
            timestamp: new Date().toISOString()
        };

        await ctx.stub.putState(
            partId,
            Buffer.from(JSON.stringify(partRecord))
        );

        return JSON.stringify(partRecord);
    }

    async queryPart(ctx, partId) {
        const data = await ctx.stub.getState(partId);
        if (!data || data.length === 0) {
            throw new Error(`Part ${partId} not found`);
        }
        return data.toString();
    }
}

module.exports = AircraftChaincode;
