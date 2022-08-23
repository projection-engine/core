import ShaderInstance from "../../production/libs/instances/ShaderInstance"
import * as shaderCode from "../templates/SELECTED.glsl"
import COMPONENTS from "../../production/data/COMPONENTS"
import FramebufferInstance from "../../production/libs/instances/FramebufferInstance"
import RendererController from "../../production/RendererController";
import CameraAPI from "../../production/libs/apis/CameraAPI";


export default class SelectedSystem {

    constructor(resolution) {
        this.shaderSilhouette = new ShaderInstance(
            shaderCode.vertexSilhouette,
            shaderCode.fragmentSilhouette
        )
        this.shader = new ShaderInstance(
            shaderCode.vertex,
            shaderCode.fragment
        )
        const TEXTURE = {
            precision: gpu.R16F,
            format: gpu.RED,
            type: gpu.FLOAT
        }
        this.frameBuffer = new FramebufferInstance(resolution.w, resolution.h).texture(TEXTURE)
    }

    drawToBuffer(selected) {
        const length = selected.length
        if (length === 0)
            return


        gpu.disable(gpu.DEPTH_TEST)
        this.shader.use()
        this.frameBuffer.startMapping()
        for (let m = 0; m < length; m++) {
            const current = RendererController.entitiesMap.get(selected[m])
            if (!current || !current.active)
                continue
            const mesh = RendererController.meshes.get(current.components[COMPONENTS.MESH]?.meshID)
            if (!mesh)
                continue
            const t = current.components[COMPONENTS.TRANSFORM]
            mesh.use()
            this.shader.bindForUse({
                projectionMatrix: CameraAPI.projectionMatrix,
                transformMatrix: t.transformationMatrix,
                viewMatrix: CameraAPI.viewMatrix
            })
            mesh.draw()
        }
        this.frameBuffer.stopMapping()
        gpu.enable(gpu.DEPTH_TEST)

    }

    drawSilhouette(selected) {
        const length = selected.length
        if (length > 0) {
            this.shaderSilhouette.use()
            this.shaderSilhouette.bindForUse({
                silhouette: this.frameBuffer.colors[0]
            })
            this.frameBuffer.draw()
            gpu.bindVertexArray(null)
        }
    }
}