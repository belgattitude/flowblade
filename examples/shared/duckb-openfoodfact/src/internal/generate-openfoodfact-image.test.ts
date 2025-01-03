import { generateOpenfoodfactImage } from './generate-openfoodfact-image';

describe('generate-openfoodfact-image', () => {
  it('should return image information', () => {
    const image = generateOpenfoodfactImage({
      code: '3068320123264',
      images: [
        {
          key: '1',
          imgid: 99,
          sizes: {
            '100': { h: 100, w: 100 },
            '400': { h: 400, w: 100 },
          },
        },
        {
          key: 'front_fr',
          imgid: 100,
          sizes: {
            '100': { h: 100, w: 100 },
            '400': { h: 400, w: 100 },
          },
        },
      ],
    });
    expect(image).toMatchSnapshot();
  });
});
