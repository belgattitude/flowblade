import { SideBar } from '@/components/sidebar/SideBar';

import { CityMultiSelect } from '../../components/prime/CityMultiSelect';
import { FolderTreeSelect } from '../../components/prime/FolderTreeSelect';

export default function TreeuDemoRoute() {
  return (
    <div className={'p-10'}>
      <SideBar>
        <div className={'m-5 flex flex-col gap-5'}>
          <CityMultiSelect />
          <FolderTreeSelect />
        </div>
      </SideBar>
    </div>
  );
}
