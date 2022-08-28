import {mat4} from "gl-matrix"
import Transformation from "../../../services/Transformation"
import COMPONENTS from "../../../data/COMPONENTS"

export default class Transformations {
    changed = new Map()
    static hasUpdatedItem = false

    execute(entities) {
        const l = entities.length
        Transformations.hasUpdatedItem = false
        for (let i = 0; i < l; i++) {
            const current = entities[i]
            if (!current.active || !current.changed) {
                this.changed.set(current.id, false)
                continue
            }
            Transformations.hasUpdatedItem = true
            this.changed.set(current.id, true)
            Transformations.transform(current)
        }
    }

    static transform(entity) {


        entity.changed = false
        Transformation.transform(entity.translation, entity.rotationQuaternion, entity.scaling, entity.transformationMatrix)

        if (entity.parent != null)
            mat4.multiply(
                entity.transformationMatrix,
                entity.parent.transformationMatrix,
                entity.transformationMatrix
            )

        const children = entity.children
        for (let j = 0; j < children.length; j++)
            Transformations.transform(children[j])
        entity.changed = false
        if (entity.components[COMPONENTS.MESH] !== undefined)
            entity.components[COMPONENTS.MESH].normalMatrix = normalMatrix(entity.transformationMatrix)
    }
}

export function normalMatrix(matrix) {
    let a00 = matrix[0], a01 = matrix[1], a02 = matrix[2], a03 = matrix[3],
        a10 = matrix[4], a11 = matrix[5], a12 = matrix[6], a13 = matrix[7],
        a20 = matrix[8], a21 = matrix[9], a22 = matrix[10], a23 = matrix[11],
        a30 = matrix[12], a31 = matrix[13], a32 = matrix[14], a33 = matrix[15],
        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06

    if (!det)
        return null
    det = 1.0 / det

    let result = []

    result[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det
    result[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det
    result[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det

    result[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det
    result[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det
    result[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det

    result[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det
    result[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det
    result[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det

    return result
}