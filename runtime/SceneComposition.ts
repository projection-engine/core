import SHADING_MODELS from "../static/SHADING_MODELS";
import StaticFBO from "../lib/StaticFBO";
import UberShader from "../resource-libs/UberShader";
import SceneRenderer from "./renderers/SceneRenderer";
import SpriteRenderer from "./renderers/SpriteRenderer";
import DecalRenderer from "./renderers/DecalRenderer";
import MeshRenderer from "./renderers/MeshRenderer";
import AtmosphereRenderer from "./renderers/AtmosphereRenderer";


export default class SceneComposition {
    static debugShadingModel = SHADING_MODELS.DETAIL
    static MAX_TRANSLUCENCY = 1000
    static transparencyIndexes = new Uint8Array(SceneComposition.MAX_TRANSLUCENCY)
    static transparenciesToLoopThrough = 0

    static execute() {
        if (!UberShader.uber)
            return

        StaticFBO.postProcessing2.startMapping()

        AtmosphereRenderer.execute()
        SceneRenderer.bindGlobalResources()
        MeshRenderer.execute(false)
        DecalRenderer.execute()
        SpriteRenderer.execute()

        StaticFBO.postProcessing2.stopMapping()

        MeshRenderer.execute(true)
    }

}