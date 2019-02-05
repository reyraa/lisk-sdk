/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */


/*
  DESCRIPTION: Migrate all trs dependant tables into trs asset field

  PARAMETERS: None
*/

-- Migrate transfer table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"data":"',convert_from(t."data",'utf8'),'"}')::json
        FROM transfer as t
        WHERE t."transactionId" = trs.id
    )
where type = 0;


-- Migrate signatures table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"signature":{"publicKey":"',encode(s."publicKey",'hex'::text),'"}}')::json
        FROM signatures as s
        WHERE s."transactionId" = trs.id
    )
where type = 1;


-- Migrate delegates table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"delegate":{"username":"',d."username",'"}}')::json
        FROM delegates as d
        WHERE d."transactionId" = trs.id
    )
where type = 2;


-- Migrate votes table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"votes":',array_to_json(regexp_split_to_array(v."votes",',')),'}')::json
        FROM votes as v
        WHERE v."transactionId" = trs.id
    )
where type = 3;


-- Migrate multisignatures table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"multisignature":{"min":"',ms.min,'","lifetime":"',ms.lifetime,'","keysgroup":',array_to_json(regexp_split_to_array(ms."keysgroup",',')),'}}')::json
        FROM multisignatures as ms
        WHERE ms."transactionId" = trs.id
    )
where type = 4;


-- Migrate dapps table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"dapps":{"type":"',d."type",'","name":"',d."name",'","description":"',d."description",'","tags":"',d."tags",'","link":"',d."link",'","icon":"',d."icon",'","category":"',d."category",'"}}')::json
        FROM dapps as d
        WHERE d."transactionId" = trs.id
    )
where type = 5;


-- Migrate intransfer table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"inTransfer":{"dappId":"',it."dappId",'"}}')::json
        FROM intransfer as it
        WHERE it."transactionId" = trs.id
    )
where type = 6;


-- Migrate outtransfer table into trs asset field
UPDATE trs
SET asset = (
        SELECT concat('{"outTransfer":{"dappId":"',ot."dappId",'","outTransactionId":"',ot."outTransactionId",'"}}')::json
        FROM outtransfer as ot
        WHERE ot."transactionId" = trs.id
    )
where type = 7;
