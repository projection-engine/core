import FramebufferInstance from "../../controllers/instances/FramebufferInstance"
import * as shaderCode from "../../data/shaders/DEFERRED.glsl"
import MaterialController from "../../controllers/MaterialController";
import RendererController from "../../controllers/RendererController";
import CameraAPI from "../../libs/CameraAPI";
import GPU from "../../controllers/GPU";
import AOPass from "./AOPass";
import SSGIPass from "./SSGIPass";
import SSRPass from "./SSRPass";
import ShadowMapPass from "./ShadowMapPass";
import STATIC_SHADERS from "../../../static/STATIC_SHADERS";
import STATIC_FRAMEBUFFERS from "../../../static/STATIC_FRAMEBUFFERS";

export default class DeferredPass {
    static gBuffer
    static deferredShader
    static compositeFBO
    static toScreenShader
    static positionSampler
    static normalSampler
    static albedoSampler
    static behaviourSampler
    static ambientSampler

    static initialize() {
        DeferredPass.gBuffer = new FramebufferInstance()
        DeferredPass.gBuffer
            .texture({attachment: 0, precision: window.gpu.RGBA32F, format: window.gpu.RGBA, type: window.gpu.FLOAT})
            .texture({attachment: 1})
            .texture({attachment: 2})
            .texture({attachment: 3})
            .texture({attachment: 4})
            .depthTest()

        DeferredPass.positionSampler = DeferredPass.gBuffer.colors[0]
        DeferredPass.normalSampler = DeferredPass.gBuffer.colors[1]
        DeferredPass.albedoSampler = DeferredPass.gBuffer.colors[2]
        DeferredPass.behaviourSampler = DeferredPass.gBuffer.colors[3]
        DeferredPass.ambientSampler = DeferredPass.gBuffer.colors[4]

        DeferredPass.deferredShader =  GPU.allocateShader(STATIC_SHADERS.PRODUCTION.DEFERRED, shaderCode.vertex, shaderCode.fragment)
        DeferredPass.compositeFBO = GPU.allocateFramebuffer(STATIC_FRAMEBUFFERS.DEFERRED_COMPOSITION).texture()
        DeferredPass.toScreenShader =  GPU.allocateShader(STATIC_SHADERS.PRODUCTION.TO_SCREEN, shaderCode.vertex, shaderCode.toScreen)
    }

    static drawFrame() {
        DeferredPass.toScreenShader.bindForUse({
            uSampler: DeferredPass.compositeFBO.colors[0]
        })
        GPU.quad.draw()
    }

    static execute() {
        const {
            meshes,
            materials
        } = RendererController.data

        const elapsed = RendererController.params.elapsed

        DeferredPass.gBuffer.startMapping()
        MaterialController.loopMeshes(
            materials,
            meshes,
            (mat, mesh, meshComponent, current) => {
                if (!mat.isDeferredShaded)
                    return

                const ambient = MaterialController.getEnvironment(current)
                MaterialController.drawMesh({
                    mesh,
                    camPosition: CameraAPI.position,
                    viewMatrix: CameraAPI.viewMatrix,
                    projectionMatrix: CameraAPI.projectionMatrix,
                    transformMatrix: current.transformationMatrix,
                    material: mat,
                    normalMatrix: meshComponent.normalMatrix,
                    materialComponent: meshComponent,
                    elapsed,
                    ambient,
                    onlyForward: false
                })
            }
        )
        DeferredPass.gBuffer.stopMapping()
    }

    static drawBuffer(entities, onWrap) {

        const {
            pointLightsQuantity,
            maxTextures,
            directionalLightsData,
            dirLightPOV,
            pointLightData
        } = RendererController.data
        const {
            ao,
            pcfSamples,
            ssr,
            ssgi
        } = RendererController.params

        onWrap(false)
        DeferredPass.compositeFBO.startMapping()
        onWrap(true)
        const uniforms = {
            screenSpaceGI: ssgi ? SSGIPass.sampler : undefined,
            screenSpaceReflections: ssr ? SSRPass.sampler : undefined,
            positionSampler: DeferredPass.positionSampler,
            normalSampler: DeferredPass.normalSampler,
            albedoSampler: DeferredPass.albedoSampler,
            behaviourSampler: DeferredPass.behaviourSampler,
            ambientSampler: DeferredPass.ambientSampler,
            aoSampler: AOPass.filteredSampler,
            cameraVec: CameraAPI.position,
            directionalLightsData,
            dirLightPOV,
            pointLightData,
            settings: [
                maxTextures, ShadowMapPass.maxResolution,
                ShadowMapPass.ready ? 0 : 1,
                ShadowMapPass.maxResolution / ShadowMapPass.resolutionPerTexture,
                pointLightsQuantity, ao ? 1 : 0,
                pcfSamples, 0, 0
            ]
        }
        if (ShadowMapPass.ready) {
            uniforms.shadowMapTexture = ShadowMapPass.shadowsFrameBuffer.depthSampler
            uniforms.shadowCube0 = ShadowMapPass.specularProbes[0].texture
            uniforms.shadowCube1 = ShadowMapPass.specularProbes[1].texture
        }
        DeferredPass.deferredShader.bindForUse(uniforms)

        GPU.quad.draw()
        DeferredPass.compositeFBO.stopMapping()
    }
}