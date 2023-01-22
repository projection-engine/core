import GPU from "../GPU";
import StaticMeshes from "../lib/StaticMeshes";
import StaticFBO from "../lib/StaticFBO";
import StaticShaders from "../lib/StaticShaders";
import CameraAPI from "../lib/utils/CameraAPI";
import Framebuffer from "../instances/Framebuffer";

/**
 * rayMarchSettings definition:
 *
 * 0: SSR-falloff
 * 1: SSR-minRayStep
 * 2: SSR-stepSize
 * 3: SSGI_stepSize
 * 4: SSGI_intensity
 * 5: ENABLED_SSGI
 * 6: ENABLED_SSR
 * 7: SSGI_maxSteps
 * 8: SSR_maxSteps
 */

let cleared = false
export default class SSGI {
    static blurSamples = 5
    static blurRadius = 5
    static enabled = true
    static rayMarchSettings = new Float32Array(3)

    static execute() {
        if (!SSGI.enabled) {
            if (!cleared) {
                StaticFBO.ssgi.clear()
                cleared = true
            }
            return
        }
        cleared = false
        const context = GPU.context
        const uniforms = StaticShaders.ssgiUniforms
        StaticFBO.ssgi.startMapping()
        StaticShaders.ssgi.bind()

        context.activeTexture(context.TEXTURE0)
        context.bindTexture(context.TEXTURE_2D, StaticFBO.visibilityDepthSampler)
        context.uniform1i(uniforms.scene_depth, 0)

        context.activeTexture(context.TEXTURE1)
        context.bindTexture(context.TEXTURE_2D, StaticFBO.postProcessing2Sampler)
        context.uniform1i(uniforms.previousFrame, 1)

        context.uniform3fv(uniforms.rayMarchSettings, SSGI.rayMarchSettings)

        StaticMeshes.drawQuad()
        SSGI.#applyBlur(context, StaticFBO.ssgiFallback, StaticFBO.ssgiSampler, true)
        SSGI.#applyBlur(context, StaticFBO.ssgi, StaticFBO.ssgiFallbackSampler, false)

    }

    static #applyBlur(context: WebGL2RenderingContext, FBO: Framebuffer, color: WebGLTexture, first: boolean) {
        const uniforms = StaticShaders.bilateralBlurUniforms


        if (first) {
            StaticShaders.bilateralBlur.bind()
            // @ts-ignore
            context.uniform1f(uniforms.blurRadius, SSGI.blurRadius)
            context.uniform1i(uniforms.samples, SSGI.blurSamples)
            context.uniform2fv(uniforms.bufferResolution, StaticFBO.ssgiFallback.resolution)

            context.activeTexture(context.TEXTURE0)
            context.bindTexture(context.TEXTURE_2D, StaticFBO.visibilityEntitySampler)
            context.uniform1i(uniforms.entityIDSampler, 0)
        }
        else
            context.uniform1i(uniforms.samples, SSGI.blurSamples/2)
        FBO.startMapping()

        context.activeTexture(context.TEXTURE1)
        context.bindTexture(context.TEXTURE_2D, color)
        context.uniform1i(uniforms.sceneColor, 1)

        StaticMeshes.drawQuad()
        FBO.stopMapping()
    }
}