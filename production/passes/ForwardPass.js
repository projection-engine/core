import MaterialController from "../controllers/MaterialController";
import Engine from "../Engine";
import CameraAPI from "../apis/CameraAPI";
import GPU from "../GPU";

export default class ForwardPass {
    static execute() {
        const materials = GPU.materials
        const {
            meshes,
            pointLightsQuantity,
            maxTextures,
            directionalLightsData,
            dirLightPOV,
            pointLightData
        } = Engine.data
        MaterialController.loopMeshes(
            meshes,
            (mat, mesh, meshComponent, current) => {
                if (!mat.isForwardShaded)
                    return


                MaterialController.drawMesh(
                    current.id,
                    mesh,
                    mat,
                    meshComponent,
                    {
                    cameraVec: CameraAPI.position,
                    viewMatrix: CameraAPI.viewMatrix,
                    projectionMatrix: CameraAPI.projectionMatrix,
                    transformMatrix: current.transformationMatrix,

                    normalMatrix: current.normalMatrix,
                    materialComponent: meshComponent,
                    directionalLightsQuantity: maxTextures,
                    directionalLightsData,
                    dirLightPOV,
                    lightQuantity: pointLightsQuantity,
                    pointLightData
                })

            }
        )
    }
}