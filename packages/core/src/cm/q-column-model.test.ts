import { type QColumn, QColumnModel } from './q-column-model';

describe('QColumnModel tests', () => {
  describe('setting column model', () => {
    const cols: QColumn[] = [
      {
        id: 'id',
        type: 'number',
      },
      {
        id: 'label',
        type: 'string',
      },
      {
        id: 'is_active',
        type: 'boolean',
      },
    ];

    it('should be iterable', () => {
      const cm = new QColumnModel({ cols: cols });
      expect([...cm]).toStrictEqual(cols);
    });
  });
});
