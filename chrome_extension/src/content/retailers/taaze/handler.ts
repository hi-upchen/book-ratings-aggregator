import { RetailerHandler } from 'utils/ContentRouter';
import { observeNodeAppearance } from 'utils/DomUtils';
import * as taaze from './utils';

export class TaazeHandler implements RetailerHandler {
  name = 'Taaze (讀冊)';

  matches(url: string): boolean {
    return /www\.taaze\.tw/.test(url) || /activity\.taaze\.tw/.test(url);
  }

  handle(document: Document): void {
    if (/www\.taaze\.tw\/index\.html/.test(location.href)) {
      // index page
      this.handleIndexPage(document);
    } else if (/www\.taaze\.tw\/products/.test(location.href) || /www\.taaze\.tw\/usedList/.test(location.href)) {
      // book detail pages
      this.handleBookDetailPage(document);
    } else if (/www\.taaze\.tw\/rwd_list/.test(location.href)) {
      // listing pages
      this.handleRWDListPage(document);
    } else if (/www\.taaze\.tw\/rwd_searchResult/.test(location.href)) {
      // search pages
      this.handleSearchPage(document);
    } else if (/activity\.taaze\.tw\/home/.test(location.href)) {
      // activity pages
      this.handleActivityHomePage(document);
    } else if (/activity\.taaze\.tw\/activity_y/.test(location.href) || /activity\.taaze\.tw\/toActivityUnitItem/.test(location.href)) {
      // additional activity pages
      this.handleActivityUnitPage(document);
    }
  }

  private handleIndexPage(document: Document): void {
    observeNodeAppearance('.bookGrid:not(.bra-processed)', () => {
      taaze.handleHomePage(document);
    });
    observeNodeAppearance('.avivid_item:not(.bra-processed)', () => {
      taaze.handleBookDetailAvividItems(document);
    }); // 其他人也看了, 你剛剛看了
  }

  private handleBookDetailPage(document: Document): void {
    taaze.handleBookDetailPage(document);
    observeNodeAppearance('.avivid_item:not(.bra-processed)', () => {
      taaze.handleBookDetailAvividItems(document);
    }); // 其他人也看了, 你剛剛看了
  }

  private handleRWDListPage(document: Document): void {
    // sample https://www.taaze.tw/rwd_list.html?t=14&k=01&d=00
    // sample https://www.taaze.tw/rwd_listView.html?t=14&k=01&d=00&a=00&c=030000000000&l=1
    
    observeNodeAppearance('.bookGridByListView:not(.bra-processed), .listBookGrid:not(.bra-processed)', () => {
      taaze.handleRWDListPage(document);
    });
    observeNodeAppearance('.avivid_item:not(.bra-processed)', () => {
      taaze.handleBookDetailAvividItems(document);
    }); // 其他人也看了, 你剛剛看了

    taaze.handleRWDListPageBestSellArea(document);
  }

  private handleSearchPage(document: Document): void {
    observeNodeAppearance('.info_frame:not(.bra-processed)', () => {
      taaze.handleSearchPage(document);
    });
  }

  private handleActivityHomePage(document: Document): void {
    // https://activity.taaze.tw/activity_y.html?masNo=1000688028&tmpName=imgUntil&_gl=1*1f4c50x*_gcl_au*MTMzNzEzNzgzNC4xNzE2MDAwNzEy*_ga*MTgyNDA0Njg3NS4xNzA2ODU3ODc4*_ga_CK2C80VFK8*MTcxNjEwMTcwMS4zLjEuMTcxNjEwNTI2Ny41NS4wLjA.
    observeNodeAppearance('.act_products:not(.bra-processed)', () => {
      taaze.handleActivityHomePage(document);
    });
    taaze.handleActivityHomePage(document);
  }

  private handleActivityUnitPage(document: Document): void {
    // https://activity.taaze.tw/activity_y.html?masNo=1000687646&tmpName=imgUntil
    // https://activity.taaze.tw/toActivityUnitItem.html?unitNO=1000440965&masNo=1000687646&current_page=1&tmpName=imgUntil#bodys
    taaze.handleActivityUnitPage(document);
  }
}