import { expect } from 'chai';
import { IncomingIDMap } from '../utils/IncomingIDMap';
import { updateIncomingIDMap } from '../utils/updateIncomingIDMap';


describe('updateIncomingIDMap', () => {
  let map: IncomingIDMap;

  beforeEach(() => {
    map = new IncomingIDMap();
  });

  it('should update the incoming links map correctly', async () => {
    map.addID('oldID', 'sourceID');
    await updateIncomingIDMap('oldID', 'newID', map);
    expect(map.getIncomingIDsFor('sourceID')).to.include('newID');
    expect(map.getIncomingIDsFor('sourceID')).to.not.include('oldID');
  });

  // Add more tests as needed...
});
