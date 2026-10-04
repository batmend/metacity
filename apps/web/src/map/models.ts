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
      const sun = new T.DirectionalLight(0xfff4e0, 2.6);
      sun.position.set(90, 150, 130);
      this.scene.add(sun);
      const fill = new T.DirectionalLight(0xdfe8ff, 0.8);
      fill.position.set(-120, 80, -60);
      this.scene.add(fill);
      this.scene.add(new T.HemisphereLight(0xe8eefc, 0x9a9183, 1.6));
      this.renderer = new T.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      this.renderer.autoClear = false;
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
