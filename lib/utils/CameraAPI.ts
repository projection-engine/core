import PostProcessingEffects from "../../templates/PostProcessingEffects";
import Engine from "../../Engine";
import ENVIRONMENT from "../../static/ENVIRONMENT";
import ArrayBufferAPI from "./ArrayBufferAPI";
import {mat4, quat, vec3, vec4} from "gl-matrix";
import ConversionAPI from "../math/ConversionAPI";
import UBO from "../../instances/UBO";
import MotionBlur from "../../runtime/MotionBlur";
import VisibilityRenderer from "../../runtime/VisibilityRenderer";

import GPU from "../../GPU";
import StaticUBOs from "../StaticUBOs";
import MutableObject from "../../MutableObject";
import Entity from "../../instances/Entity";
import CameraComponent from "../../templates/components/CameraComponent";


/**
 * @field notificationBuffers {float32array [viewNeedsUpdate, projectionNeedsUpdate, isOrthographic, hasChanged, translationSmoothing, rotationSmoothing]}
 * @field transformationBuffer {float32array [translation.x, translation.y, translation.z, rotation.x, rotation.y, rotation.z, rotation.worker]}
 * @field projectionBuffer {float32array [zFar, zNear, fov, aR, orthographicSize]}
 */


const ORTHOGRAPHIC = 1, PERSPECTIVE = 0
let notificationBuffers

function getNotificationBuffer() {
    const b = ArrayBufferAPI.allocateVector(6, 0)
    b[0] = 1
    b[1] = 1
    b[2] = PERSPECTIVE
    b[3] = 0
    b[4] = .001
    b[5] = .1
    return b
}

interface Serialization {
    rotationSmoothing: number,
    translationSmoothing: number,
    metadata: any,
    rotation: number[],
    translation: number[]
}

const TEMPLATE_CAMERA = new CameraComponent()
const toRad = Math.PI / 180
export default class CameraAPI {
    static #dynamicAspectRatio = false
    static metadata = new PostProcessingEffects()
    static position = ArrayBufferAPI.allocateVector(3)
    static viewMatrix = ArrayBufferAPI.allocateMatrix(4, true)
    static projectionMatrix = ArrayBufferAPI.allocateMatrix(4, true)
    static invViewMatrix = ArrayBufferAPI.allocateMatrix(4, true)
    static invProjectionMatrix = ArrayBufferAPI.allocateMatrix(4, true)
    static viewProjectionMatrix = ArrayBufferAPI.allocateMatrix(4, true)
    static previousViewProjectionMatrix = ArrayBufferAPI.allocateMatrix(4, true)
    static staticViewMatrix = ArrayBufferAPI.allocateMatrix(4, true)
    static skyboxProjectionMatrix = ArrayBufferAPI.allocateMatrix(4, true)
    static #UBOBuffer = ArrayBufferAPI.allocateVector(84)
    static #projectionBuffer = ArrayBufferAPI.allocateVector(5)
    static translationBuffer = <vec3>ArrayBufferAPI.allocateVector(3)
    static rotationBuffer = <quat>ArrayBufferAPI.allocateVector(4, 0, true)
    static notificationBuffers = getNotificationBuffer()

    static #worker: Worker
    static trackingEntity

    static #initialized = false

    static initialize() {
        if (CameraAPI.#initialized)
            return
        CameraAPI.#initialized = true


        CameraAPI.#worker = new Worker("./camera-worker.js")

        notificationBuffers = CameraAPI.notificationBuffers
        CameraAPI.#projectionBuffer[4] = 10
        CameraAPI.#worker.postMessage([
            notificationBuffers,
            CameraAPI.position,
            CameraAPI.viewMatrix,
            CameraAPI.projectionMatrix,
            CameraAPI.invViewMatrix,
            CameraAPI.invProjectionMatrix,
            CameraAPI.staticViewMatrix,
            CameraAPI.translationBuffer,
            CameraAPI.rotationBuffer,
            CameraAPI.skyboxProjectionMatrix,
            CameraAPI.#projectionBuffer,
            CameraAPI.viewProjectionMatrix,
            CameraAPI.#UBOBuffer
        ])

        new ResizeObserver(CameraAPI.updateAspectRatio)
            .observe(GPU.canvas)
        notificationBuffers[3] = 1
    }

    static syncThreads() {
        CameraAPI.#worker.postMessage(0)
    }

    static updateUBOs() {
        const entity = CameraAPI.trackingEntity
        if (entity && entity.__changedBuffer[1])
            CameraAPI.update(entity._translation, entity._rotationQuat)

        if (notificationBuffers[3]) {
            VisibilityRenderer.needsUpdate = true
            const UBO = StaticUBOs.cameraUBO
            notificationBuffers[3] = 0
            UBO.bind()
            UBO.updateBuffer(CameraAPI.#UBOBuffer)
            UBO.unbind()
        } else
            VisibilityRenderer.needsUpdate = false
    }

    static updateAspectRatio() {
        const bBox = GPU.canvas.getBoundingClientRect()
        ConversionAPI.canvasBBox = bBox
        if (Engine.environment === ENVIRONMENT.DEV || CameraAPI.#dynamicAspectRatio) {
            CameraAPI.aspectRatio = bBox.width / bBox.height
            CameraAPI.updateProjection()
        }
    }

    static toOrigin() {
        CameraAPI.update(vec3.create(), quat.create())
    }

    static get didChange(): number {
        return notificationBuffers[3]
    }

    static get isOrthographic(): boolean {
        return notificationBuffers[2] === ORTHOGRAPHIC
    }

    static set isOrthographic(data) {
        notificationBuffers[2] = data ? ORTHOGRAPHIC : PERSPECTIVE
        notificationBuffers[1] = 1
    }


    static get zFar(): number {
        return CameraAPI.#projectionBuffer[0]
    }

    static get zNear(): number {
        return CameraAPI.#projectionBuffer[1]
    }

    static get fov(): number {
        return CameraAPI.#projectionBuffer[2]
    }

    static get aspectRatio(): number {
        return CameraAPI.#projectionBuffer[3]
    }

    static get orthographicProjectionSize(): number {
        return CameraAPI.#projectionBuffer[4]
    }


    static set zFar(data: number) {
        CameraAPI.#projectionBuffer[0] = data
    }

    static set zNear(data: number) {
        CameraAPI.#projectionBuffer[1] = data
    }

    static set fov(data: number) {
        CameraAPI.#projectionBuffer[2] = data
    }

    static set aspectRatio(data: number) {
        CameraAPI.#projectionBuffer[3] = data
    }

    static set orthographicProjectionSize(data: number) {
        CameraAPI.#projectionBuffer[4] = data
    }

    static set translationSmoothing(data: number) {
        notificationBuffers[4] = data
    }

    static get translationSmoothing(): number {
        return notificationBuffers[4]
    }

    static set rotationSmoothing(data: number) {
        notificationBuffers[5] = data
    }

    static get rotationSmoothing(): number {
        return notificationBuffers[5]
    }

    static updateProjection() {
        notificationBuffers[1] = 1
    }

    static updateView() {
        notificationBuffers[0] = 1
    }

    static update(translation, rotation) {
        if (translation != null)
            vec3.copy(CameraAPI.translationBuffer, translation)
        if (rotation != null)
            vec4.copy(CameraAPI.rotationBuffer, rotation)
        notificationBuffers[0] = 1
    }

    static serializeState(): Serialization {
        return {
            rotationSmoothing: CameraAPI.rotationSmoothing,
            translationSmoothing: CameraAPI.translationSmoothing,
            metadata: {...CameraAPI.metadata},
            rotation: [...CameraAPI.rotationBuffer],
            translation: [...CameraAPI.translationBuffer]
        }
    }

    static restoreState(state: Serialization) {
        const {rotation, translation, rotationSmoothing, translationSmoothing, metadata} = state
        if (metadata) {
            const keys = Object.keys(metadata)
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i].replaceAll("_", "")
                CameraAPI.metadata[key] = metadata[keys[i]]
            }
        }
        CameraAPI.translationBuffer[0] = translation[0]
        CameraAPI.translationBuffer[1] = translation[1]
        CameraAPI.translationBuffer[2] = translation[2]

        CameraAPI.rotationBuffer[0] = rotation[0]
        CameraAPI.rotationBuffer[1] = rotation[1]
        CameraAPI.rotationBuffer[2] = rotation[2]
        CameraAPI.rotationBuffer[3] = rotation[3]

        CameraAPI.rotationSmoothing = rotationSmoothing
        CameraAPI.translationSmoothing = translationSmoothing

        CameraAPI.updateView()
    }

    static updateViewTarget(data: Entity | Object) {
        if (!data)
            CameraAPI.trackingEntity = undefined

        let cameraObj
        if (data instanceof Entity) {
            CameraAPI.trackingEntity = data
            cameraObj = data.cameraComponent
        } else
            cameraObj = data

        if (!data)
            return

        cameraObj = {...TEMPLATE_CAMERA, ...cameraObj}

        MotionBlur.enabled = cameraObj.motionBlurEnabled ||cameraObj.cameraMotionBlur

        MotionBlur.velocityScale = cameraObj.mbVelocityScale
        MotionBlur.maxSamples = cameraObj.mbSamples

        CameraAPI.zFar = cameraObj.zFar
        CameraAPI.zNear = cameraObj.zNear
        CameraAPI.fov = cameraObj.fov < Math.PI * 2 ? cameraObj.fov : cameraObj.fov * toRad
        CameraAPI.#dynamicAspectRatio = cameraObj.dynamicAspectRatio
        CameraAPI.isOrthographic = cameraObj.ortho
        CameraAPI.metadata.cameraMotionBlur = cameraObj.cameraMotionBlur
        CameraAPI.metadata.vignetteEnabled = cameraObj.vignette
        CameraAPI.metadata.vignetteStrength = cameraObj.vignetteStrength
        CameraAPI.metadata.distortion = cameraObj.distortion
        CameraAPI.metadata.distortionStrength = cameraObj.distortionStrength
        CameraAPI.metadata.chromaticAberration = cameraObj.chromaticAberration
        CameraAPI.metadata.chromaticAberrationStrength = cameraObj.chromaticAberrationStrength
        CameraAPI.metadata.filmGrain = cameraObj.filmGrain
        CameraAPI.metadata.filmGrainStrength = cameraObj.filmGrainStrength
        CameraAPI.metadata.bloom = cameraObj.bloom
        CameraAPI.metadata.bloomThreshold = cameraObj.bloomThreshold
        CameraAPI.metadata.gamma = cameraObj.gamma
        CameraAPI.metadata.exposure = cameraObj.exposure


        CameraAPI.metadata.apertureDOF = cameraObj.apertureDOF
        CameraAPI.metadata.focalLengthDOF = cameraObj.focalLengthDOF
        CameraAPI.metadata.focusDistanceDOF = cameraObj.focusDistanceDOF
        CameraAPI.metadata.samplesDOF = cameraObj.samplesDOF
        CameraAPI.metadata.DOF = cameraObj.enabledDOF

        if (!cameraObj.dynamicAspectRatio && cameraObj.aspectRatio)
            CameraAPI.aspectRatio = cameraObj.aspectRatio
        else
            CameraAPI.updateAspectRatio()

        if (data instanceof Entity)
            CameraAPI.update(data._translation, data._rotationQuat)
        CameraAPI.updateProjection()
    }
}

