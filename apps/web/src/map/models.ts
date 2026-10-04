/**
 * Нарийвчилсан 3D загвар (glTF) давхарга — three.js-ээр MapLibre-ийн custom layer дотор render хийнэ.
 *
 * three.js (~150 KB gzip) болон загвар нь зөвхөн анх удаа дурсгалт барилга сонгоход
 * татагдана (dynamic import) — эхний ачаалалтын хэмжээг нэмэхгүй.
 */
import { MercatorCoordinate, type CustomLayerInterface, type Map as MLMap } from 'maplibre-gl';
import type { LandmarkModel } from '@metacity/schema';

type Three = typeof import('three');

export const MODEL_LAYER_ID = 'landmark-model';

interface Placed {
  def: LandmarkModel;
  object: import('three').Object3D;
}

export class ModelLayer implements CustomLayerInterface {
  readonly id = MODEL_LAYER_ID;
  readonly type = 'custom' as const;
  readonly renderingMode = '3d' as const;
  private three: Three | null = null;
  private scene: import('three').Scene | null = null;
  private camera: import('three').Camera | null = null;
  private renderer: import('three').WebGLRenderer | null = null;
  private map: MLMap | null = null;
  private placed: Placed | null = null;
  private pending: LandmarkModel | null = null;
  private cache = new Map<string, import('three').Object3D>();

  onAdd(map: MLMap, gl: WebGL2RenderingContext): void {
    this.map = map;
    void this.ensureThree().then((T) => {
      this.scene = new T.Scene();
      this.camera = new T.Camera();
      // Нар: зүүн урдаас дээрээс (glTF: x=зүүн, y=дээш, z=урд) — урд фасад, колоннад гэрэлтэнэ
      const sun = new T.DirectionalLight(0xfff4e0, 1.7);
      sun.position.set(90, 150, 130);
      this.scene.add(sun);
      const fill = new T.DirectionalLight(0xdfe8ff, 0.45);
      fill.position.set(-120, 80, -60);
      this.scene.add(fill);
      this.scene.add(new T.HemisphereLight(0xe8eefc, 0x9a9183, 0.55));
      this.renderer = new T.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      this.renderer.autoClear = false;
      // Бодит материал: ACES tone mapping + орчны тусгал (шил, алт, гантиг тусгалтай болно)
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.95;
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const cam = sun.shadow.camera;
      cam.left = -160; cam.right = 160; cam.top = 160; cam.bottom = -160; cam.near = 1; cam.far = 600;
      sun.shadow.bias = -0.0004;
      void import('three/examples/jsm/environments/RoomEnvironment.js').then(({ RoomEnvironment }) => {
        if (!this.renderer || !this.scene) return;
        const pmrem = new T.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environmentIntensity = 0.45;
        this.map?.triggerRepaint();
      });
      if (this.pending) void this.show(this.pending);
    });
  }

  private async ensureThree(): Promise<Three> {
    this.three ??= await import('three');
    return this.three;
  }

  /** Загварыг ачаалж (cache), байрлуулна. */
  async show(def: LandmarkModel): Promise<void> {
    if (!this.scene || !this.three) {
      this.pending = def;
      return;
    }
    this.pending = null;
    this.hide();
    let obj = this.cache.get(def.id);
    if (!obj) {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}${def.url}`);
      obj = gltf.scene;
      obj.traverse((o) => {
        const m = o as import('three').Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
          const mat = m.material as import('three').MeshStandardMaterial;
          if (mat && mat.name === 'glass') {
            mat.envMapIntensity = 1.6;
            mat.roughness = 0.12;
            mat.metalness = 0.35;
          }
          if (mat && mat.name === 'gold') mat.envMapIntensity = 1.4;
        }
      });
      this.cache.set(def.id, obj);
    }
    this.scene.add(obj);
    this.placed = { def, object: obj };
    this.map?.triggerRepaint();
  }

  hide(): void {
    if (this.placed && this.scene) this.scene.remove(this.placed.object);
    this.placed = null;
    this.map?.triggerRepaint();
  }

  get current(): LandmarkModel | null {
    return this.placed?.def ?? null;
  }

  render(_gl: WebGL2RenderingContext, options: { defaultProjectionData?: { mainMatrix: ArrayLike<number> }; modelViewProjectionMatrix: ArrayLike<number> }): void {
    const T = this.three;
    if (!T || !this.scene || !this.camera || !this.renderer || !this.placed) return;
    const { anchor } = this.placed.def;
    const mc = MercatorCoordinate.fromLngLat([anchor.lng, anchor.lat], 0);
    const s = mc.meterInMercatorCoordinateUnits();
    // glTF y-up → газрын зураг: X тэнхлэгээр 90° эргүүлж, y-г урвуулна (mercator y урагшаа өснө)
    const rotX = new T.Matrix4().makeRotationAxis(new T.Vector3(1, 0, 0), Math.PI / 2);
    const local = new T.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new T.Vector3(s, -s, s)).multiply(rotX);
    const proj = new T.Matrix4().fromArray(Array.from(options.defaultProjectionData?.mainMatrix ?? options.modelViewProjectionMatrix));
    this.camera.projectionMatrix = proj.multiply(local);
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
  }
}
