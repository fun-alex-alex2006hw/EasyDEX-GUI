import React from 'react';
import { translate } from '../../translate/translate';

class WalletsBasiliskRefresh extends React.Component {
  render() {
    if (this.props && this.props.Dashboard.basiliskRefresh) {
      return (
        <div data-edexcoin="COIN" id="edexcoin_dashboard_basilisk_refresh_status">
          <div className="col-xs-12 margin-top-20">
            <div className="col-xs-12">
              <div className="panel">
                <div className="panel-heading">
                  <h3 className="panel-title">{translate('INDEX.FETCHING_BASILISK_DATA')}</h3>
                  <div className="panel-actions">
                    <a className="panel-action icon md-refresh-alt" aria-hidden="true"></a>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover table-striped tbl_edexcoin_dashboard_basilisk_refresh_status">
                    <thead>
                      <tr>
                        <th>{translate('INDEX.ADDRESS')}</th>
                        <th>{translate('INDEX.LIST_UNSPENT')}</th>
                        <th>{translate('INDEX.LIST_TRANSACTIONS')}</th>
                        <th>{translate('INDEX.GET_BALANCE')}</th>
                        <th>{translate('INDEX.REFRESH')}</th>
                      </tr>
                    </thead>
                    <tbody>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return null;
    }
  }
}

export default WalletsBasiliskRefresh;