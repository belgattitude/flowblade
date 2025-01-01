type ImageKey = 'front_fr' | 'nutrition_fr' | `${number}`;
export type OpenfoodfactImage = {
  key: ImageKey;
  imgid: number | null;
  sizes: {
    '100'?: { h: number; w: number };
    '200'?: { h: number; w: number };
    '300'?: { h: number; w: number };
    '400'?: { h: number; w: number };
    full?: { h: number; w: number };
  };
};
const baseUrl = 'https://images.openfoodfacts.org/images/products';

type ImageData = {
  baseUrl: string;
  prefix: string;
  image: {
    key: ImageKey;
    imgid: number;
    fileName: string;
    resolutions: number[];
    url: string;
  };
};

export const generateOpenfoodfactImage = (data: {
  code: string;
  images: OpenfoodfactImage[];
}): ImageData | null => {
  const { code, images } = data;
  const prefix = `${code.slice(0, 3)}/${code.slice(3, 6)}/${code.slice(6, 9)}/${code.slice(9)}`;
  let img: ImageData['image'] | undefined = undefined;
  for (const image of images) {
    if (image.imgid === null) {
      continue;
    }
    const resolutions = Object.keys(image.sizes).map((key) =>
      Number.parseInt(key, 10)
    );
    img = {
      key: image.key,
      imgid: image.imgid,
      resolutions,
      fileName: `${image.key}.${image.imgid}.400.jpg`,
      url: `${baseUrl}/${prefix}/1.400.jpg`,
    };
  }
  if (img === undefined) {
    // throw new Error(
    //  `No image found for code ${code} - ${JSON.stringify(images)}`
    // );
    return null;
  }
  return {
    baseUrl,
    prefix,
    image: img,
  };
};
