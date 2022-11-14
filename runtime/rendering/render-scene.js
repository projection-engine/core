import Engine from "../../Engine";
import MaterialAPI from "../../lib/rendering/MaterialAPI";
import GBuffer from "./GBuffer";

export default function renderScene(){
    const uniforms = GBuffer.uniforms
    const deferred = MaterialAPI.deferredShadedEntities

    GBuffer.gBuffer.startMapping()

    let size = deferred.length
    for (let m = 0; m < size; m++) {
        const current = deferred[m]
        const entity = current.entity
        if (!entity.active)
            continue

        uniforms.previousModelMatrix = entity.previousModelMatrix
        uniforms.transformMatrix = entity.matrix
        uniforms.meshID = entity.pickID

        MaterialAPI.drawMesh(
            entity.id,
            current.mesh,
            current.material,
            current.component,
            uniforms
        )
    }

    MaterialAPI.loopTerrain(
        Engine.data.terrain,
        (mat, mesh, meshComponent, current) => {
            uniforms.transformMatrix = current.matrix
            MaterialAPI.drawMesh(current.id, mesh, mat, meshComponent, uniforms)
        }
    )

    GBuffer.gBuffer.stopMapping()
}