import {v4} from "uuid";
import MessageInterface from "./MessageInterface";
import serializeStructure from "../../utils/serialize-structure";

const isPlainObject = value => value?.constructor === Object;

export default function parseMessage(messages: any[], type, src):MessageInterface[] {
    let parts:MessageInterface[] = []
    for (let i = 0; i < messages.length; i++) {
        const blockID = v4()
        if (typeof messages[i] === "object") {
            const str = isPlainObject(messages[i]) ? "Plain Object" : messages[i].constructor.name
            parts.push(...str.split("\n").map((message, i) => ({
                type,
                message: message + " " + messages[i].toString(),
                object: serializeStructure(messages[i]),
                blockID,
                src,
                notFirstOnBlock: i > 0
            })))
        } else
            parts.push({
                type,
                message: messages[i],
                blockID,
                src
            })
    }
    return parts
}