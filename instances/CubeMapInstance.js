import {mat4} from "gl-matrix";
import {lookAt} from "../utils/utils";
import * as  shaderCode from '../shaders/CUBE_MAP.glsl'
import ShaderInstance from "./ShaderInstance";

export default class CubeMapInstance {
    texture
    prefiltered
    irradianceTexture
    gpu
    _prefilteredShader
    _res
    __resChanged
    constructor(gpu, resolution, asDepth) {
        this.gpu = gpu

        this._res = resolution
        this._prefilteredShader = asDepth ? null : new ShaderInstance(shaderCode.vertex, shaderCode.prefiltered, gpu)
        this._irradianceShader = asDepth ? null : new ShaderInstance(shaderCode.vertex, shaderCode.irradiance, gpu)

        this._frameBuffer =  gpu.createFramebuffer()
        this._asDepth = asDepth
    }

    set vbo(_) {
    }

    set resolution(data) {
        this._res = data
        this.__resChanged = true
    }

    get resolution() {
        return this._res
    }

    generateIrradiance(cubeBuffer, sampler=this.texture) {
        if (!this._asDepth) {
            this._irradianceShader.use()
            this.draw((yaw, pitch, perspective) => {
                this._irradianceShader.bindForUse({
                    projectionMatrix: perspective,
                    viewMatrix: lookAt(yaw, pitch, [0, 0, 0]),
                    uSampler: sampler
                })
                this.gpu.drawArrays(this.gpu.TRIANGLES, 0, 36)
            }, cubeBuffer, undefined, undefined, true)
        }
    }

    generatePrefiltered(mipLevels = 6, resolution = 128, cubeBuffer) {

        if (!this._asDepth) {
            const perspective = mat4.perspective([], 1.57, 1, .1, 10),
                gpu = this.gpu

            gpu.bindVertexArray(null)
            gpu.viewport(0, 0, resolution, resolution)
            this.prefiltered = this._initializeTexture(resolution, true);
            gpu.generateMipmap(gpu.TEXTURE_CUBE_MAP)

            gpu.bindFramebuffer(gpu.FRAMEBUFFER, this._frameBuffer)

            const rbo = gpu.createRenderbuffer();
            gpu.bindRenderbuffer(gpu.RENDERBUFFER, rbo)
            gpu.renderbufferStorage(gpu.RENDERBUFFER, gpu.DEPTH_COMPONENT24, resolution, resolution)
            gpu.framebufferRenderbuffer(gpu.FRAMEBUFFER, gpu.DEPTH_ATTACHMENT, gpu.RENDERBUFFER, rbo)

            this._prefilteredShader.use()
            cubeBuffer.enable()

            for (let i = 0; i < mipLevels; i++) {
                const currentRes = resolution * Math.pow(0.5, i)
                const roughness = i / (mipLevels - 1)
                gpu.viewport(0, 0, currentRes, currentRes)
                for (let j = 0; j < 6; j++) {
                    gpu.renderbufferStorage(gpu.RENDERBUFFER, gpu.DEPTH_COMPONENT24, currentRes, currentRes);
                    const rotations = getRotation(j)
                    gpu.framebufferTexture2D(
                        gpu.FRAMEBUFFER,
                        gpu.COLOR_ATTACHMENT0,
                        gpu.TEXTURE_CUBE_MAP_POSITIVE_X + j,
                        this.prefiltered,
                        i
                    );

                    this._prefilteredShader.bindForUse({
                        projectionMatrix: perspective,
                        viewMatrix: lookAt(rotations.yaw, rotations.pitch, [0, 0, 0]),
                        roughness: roughness,
                        environmentMap: this.texture
                    })

                    gpu.drawArrays(gpu.TRIANGLES, 0, 36)
                }
            }
            cubeBuffer.disable()

            this.gpu.bindFramebuffer(this.gpu.FRAMEBUFFER, null)
            this.gpu.bindRenderbuffer(this.gpu.RENDERBUFFER, null)
            this.gpu.bindTexture(this.gpu.TEXTURE_2D, null)
            this.gpu.bindTexture(this.gpu.TEXTURE_CUBE_MAP, null)


            this.gpu.deleteRenderbuffer(rbo)

            return this
        } else
            return this
    }

    draw(callback, cubeBuffer, zFar = 10, zNear = .1, asIrradiance) {
        let resolution = asIrradiance ? 32 : this._res, texture

        const perspective = mat4.perspective([], Math.PI / 2, 1, zNear, zFar),
            gpu = this.gpu

        gpu.bindVertexArray(null)
        gpu.bindFramebuffer(gpu.FRAMEBUFFER, this._frameBuffer)
        gpu.viewport(0, 0, resolution, resolution)

        const rbo = gpu.createRenderbuffer();
        gpu.bindRenderbuffer(gpu.RENDERBUFFER, rbo)
        gpu.renderbufferStorage(gpu.RENDERBUFFER, gpu.DEPTH_COMPONENT24, resolution, resolution)
        gpu.framebufferRenderbuffer(gpu.FRAMEBUFFER, gpu.DEPTH_ATTACHMENT, gpu.RENDERBUFFER, rbo)


        if (!asIrradiance) {
            if (!this.texture || this.__resChanged)
                this.texture = this._initializeTexture(resolution);

            this.__resChanged = false
            texture = this.texture
        } else {
            if (!this.irradianceTexture)
                this.irradianceTexture = this._initializeTexture(resolution);

            texture = this.irradianceTexture
        }

        if (cubeBuffer && !this._asDepth)
            cubeBuffer.enable()

        for (let i = 0; i < 6; i++) {
            const rotations = getRotation(i)
            gpu.framebufferTexture2D(
                gpu.FRAMEBUFFER,
                this._asDepth ? gpu.DEPTH_ATTACHMENT : gpu.COLOR_ATTACHMENT0,
                gpu.TEXTURE_CUBE_MAP_POSITIVE_X + i,
                texture,
                0
            )
            gpu.clear(gpu.COLOR_BUFFER_BIT | gpu.DEPTH_BUFFER_BIT);
            callback(rotations.yaw, rotations.pitch, perspective, i)
        }
        if (cubeBuffer && !this._asDepth)
            cubeBuffer.disable()

        gpu.deleteRenderbuffer(rbo)
        return this
    }

    _initializeTexture(resolution, mipmap) {
        const gpu = this.gpu
        gpu.viewport(0, 0, resolution, resolution)
        let texture = gpu.createTexture();
        gpu.bindTexture(gpu.TEXTURE_CUBE_MAP, texture);

        gpu.texParameteri(gpu.TEXTURE_CUBE_MAP, gpu.TEXTURE_MAG_FILTER, this._asDepth ? gpu.NEAREST : gpu.LINEAR);
        gpu.texParameteri(gpu.TEXTURE_CUBE_MAP, gpu.TEXTURE_MIN_FILTER, this._asDepth ? gpu.NEAREST : (mipmap ? gpu.LINEAR_MIPMAP_LINEAR : gpu.LINEAR));

        gpu.texParameteri(gpu.TEXTURE_CUBE_MAP, gpu.TEXTURE_WRAP_S, gpu.CLAMP_TO_EDGE);
        gpu.texParameteri(gpu.TEXTURE_CUBE_MAP, gpu.TEXTURE_WRAP_T, gpu.CLAMP_TO_EDGE);
        gpu.texParameteri(gpu.TEXTURE_CUBE_MAP, gpu.TEXTURE_WRAP_R, gpu.CLAMP_TO_EDGE);
        const d =[
            {access: gpu.TEXTURE_CUBE_MAP_POSITIVE_X},
            {access: gpu.TEXTURE_CUBE_MAP_NEGATIVE_X},
            {access: gpu.TEXTURE_CUBE_MAP_POSITIVE_Y},
            {access: gpu.TEXTURE_CUBE_MAP_NEGATIVE_Y},
            {access: gpu.TEXTURE_CUBE_MAP_POSITIVE_Z},
            {access: gpu.TEXTURE_CUBE_MAP_NEGATIVE_Z}
        ]
        for (let i = 0; i < 6; i++) {
            gpu.texImage2D(
                d[i].access,
                0,
                this._asDepth ? gpu.DEPTH_COMPONENT32F : gpu.RGBA16F,
                resolution,
                resolution,
                0,
                this._asDepth ? gpu.DEPTH_COMPONENT : gpu.RGBA,
                gpu.FLOAT,
                null);
        }

        return texture
    }

}


function getRotation(index) {

    switch (index) {
        case 0:
            return {
                yaw: 1.57,
                pitch: 0,
            }
        case 1:
            return {
                yaw: -1.57,
                pitch: 0,
            }
        case 2:
            return {
                yaw: Math.PI,
                pitch: -1.57,
            }
        case 3:
            return {
                yaw: Math.PI,
                pitch: 1.57,
            }
        case 4:
            return {
                yaw: Math.PI,
                pitch: 0,
            }
        case 5:
            return {
                yaw: 0,
                pitch: 0,
            }
        default :
            return {
                yaw: 0,
                pitch: 0,
            }
    }

}


