import LineAPI from "./api/rendering/LineAPI";
import ImageWorker from "./workers/image/ImageWorker";
import TerrainWorker from "./workers/terrain/TerrainWorker";
import CameraAPI from "./api/CameraAPI";
import TransformationPass from "./runtime/TransformationPass";
import CubeMapAPI from "./api/CubeMapAPI";
import initializeShaders from "./utils/initialize-shaders";
import initializeStaticMeshes from "./utils/initialize-static-meshes";
import initializeFrameBuffers from "./utils/initialize-frame-buffers";
import initializeMaterialsAndTextures from "./utils/initialize-materials-and-textures";
import LightsAPI from "./api/LightsAPI";
import QUAD_VERT from "./shaders/QUAD.vert"
import BRDF_FRAG from "./shaders/BRDF_GEN.frag"
import Shader from "./instances/Shader";
import Framebuffer from "./instances/Framebuffer";

export default class GPU {
    static context
    static activeShader
    static activeFramebuffer
    static activeMesh
    static materials = new Map()
    static shaders = new Map()
    static frameBuffers = new Map()
    static meshes = new Map()
    static instancingGroup = new Map()
    static textures = new Map()
    static cubeBuffer
    static BRDF
    static internalResolution = {w: window.outerWidth, h: window.outerHeight}
    static quad


    static async initializeContext(canvas, width, height) {
        if (GPU.context != null)
            return
        GPU.internalResolution = {w: width, h: height}
        window.gpu = canvas.getContext("webgl2", {
            antialias: false,
            preserveDrawingBuffer: true,
            premultipliedAlpha: false
        })
        GPU.context = gpu

        gpu.getExtension("EXT_color_buffer_float")
        gpu.getExtension("OES_texture_float")
        gpu.getExtension("OES_texture_float_linear")
        gpu.enable(gpu.BLEND)
        gpu.blendFunc(gpu.SRC_ALPHA, gpu.ONE_MINUS_SRC_ALPHA)
        gpu.enable(gpu.CULL_FACE)
        gpu.cullFace(gpu.BACK)
        gpu.enable(gpu.DEPTH_TEST)
        gpu.depthFunc(gpu.LESS)
        gpu.frontFace(gpu.CCW)

        CameraAPI.initialize()
        LightsAPI.initialize()
        TransformationPass.initialize()
        TerrainWorker.initialize()
        ImageWorker.initialize()


        initializeFrameBuffers()
        initializeStaticMeshes()
        initializeShaders()
        await initializeMaterialsAndTextures()

        CubeMapAPI.initialize()
        LineAPI.initialize()

        const FBO = new Framebuffer(512, 512).texture({precision: gpu.RG32F, format: gpu.RG})
        const brdfShader = new Shader(QUAD_VERT, BRDF_FRAG)

        FBO.startMapping()
        brdfShader.bindForUse({})
        drawQuad()
        FBO.stopMapping()
        GPU.BRDF = FBO.colors[0]
        gpu.deleteProgram(brdfShader.program)
    }

}