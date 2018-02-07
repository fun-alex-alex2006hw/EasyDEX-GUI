import React from 'react';
import { connect } from 'react-redux';
import { translate } from '../../../translate/translate';
import {
  toggleNotaryElectionsModal,
  shepherdElectionsSend,
  shepherdElectionsLogout,
  shepherdElectionsLogin,
  shepherdElectionsStatus,
  triggerToaster,
  shepherdElectionsBalance,
  shepherdElectionsTransactions,
} from '../../../actions/actionCreators';
import Store from '../../../store';
import { secondsToString } from '../../../util/time';
import { isPositiveNumber } from '../../../util/number';
import mainWindow from '../../../util/mainWindow';
import Spinner from '../spinner/spinner';

const ELECTIONS_SYNC_UPDATE_INTERVAL = 120000; // every 2 min

class NotaryElectionsModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loginPassphrase: '',
      seedInputVisibility: false,
      userType: 'voter',
      region: null,
      trimPassphraseTimer: null,
      isAuth: false,
      balance: 0,
      transactions: null,
      coin: mainWindow.nnVoteChain,
      pub: null,
      amount: 0,
      address: '',
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.closeModal = this.closeModal.bind(this);
    this.toggleSeedInputVisibility = this.toggleSeedInputVisibility.bind(this);
    this.resizeLoginTextarea = this.resizeLoginTextarea.bind(this);
    this.updateLoginPassPhraseInput = this.updateLoginPassPhraseInput.bind(this);
    this.setUserType = this.setUserType.bind(this);
    this.setRegion = this.setRegion.bind(this);
    this.loginSeed = this.loginSeed.bind(this);
    this.logout = this.logout.bind(this);
    this.sync = this.sync.bind(this);
    this.send = this.send.bind(this);
    this.updateInput = this.updateInput.bind(this);
    this.sendValidate = this.sendValidate.bind(this);
    this.electionsDataInterval = null;
  }

  sendValidate() {
    let valid = true;

    const _amount = this.state.amount;
    const _balance = this.state.balance;
    const _fee = 0.0001;

    if (Number(_amount) + _fee > _balance) {
      Store.dispatch(
        triggerToaster(
          `${translate('SEND.INSUFFICIENT_FUNDS')} ${translate('SEND.MAX_AVAIL_BALANCE')} ${Number(_balance - _fee)} ${this.state.coin}`,
          translate('TOASTR.WALLET_NOTIFICATION'),
          'error'
        )
      );
      valid = false;
    } else if (Number(_amount) < _fee) {
      Store.dispatch(
        triggerToaster(
          `${translate('SEND.AMOUNT_IS_TOO_SMALL', this.state.amount)}, ${translate('SEND.MIN_AMOUNT_IS', this.state.coin)} ${_fee}`,
          translate('TOASTR.WALLET_NOTIFICATION'),
          'error'
        )
      );
      valid = false;
    }

    if (!this.state.address ||
        this.state.address.length < 34) {
      Store.dispatch(
        triggerToaster(
          'Wrong address format',
          translate('TOASTR.WALLET_NOTIFICATION'),
          'error'
        )
      );
      valid = false;
    }

    if (!isPositiveNumber(this.state.amount)) {
      Store.dispatch(
        triggerToaster(
          translate('SEND.AMOUNT_POSITIVE_NUMBER'),
          translate('TOASTR.WALLET_NOTIFICATION'),
          'error'
        )
      );
      valid = false;
    }

    return valid;
  }

  send() {
    if (this.sendValidate()) {
      shepherdElectionsSend(
        this.state.coin,
        (this.state.amount * 100000000) - 10000,
        this.state.address,
        this.state.pub,
        'ne2k18-' + this.state.region,
      )
      .then((res) => {
        if (res.msg === 'success') {
          Store.dispatch(
            triggerToaster(
              `You succesfully voted ${this.state.amount} for ${this.state.address}`,
              'Notary voting 2018',
              'success',
              false
            )
          );
          let _transactions = this.state.transactions;
          _transactions.unshift({
            address: this.state.address,
            amount: this.state.amount - 0.0001,
            region: 'ne2k18-' + this.state.region,
            timestamp: Math.floor(Date.now() / 1000),
          });
          this.setState({
            transactions: _transactions,
          });
        } else {
          Store.dispatch(
            triggerToaster(
              res.result.txid || res.result,
              'Notary voting 2018',
              'error'
            )
          );
        }
      });
    }
  }

  sync() {
    shepherdElectionsStatus()
    .then((res) => {
      if (res.result !== 'unauth') {
        shepherdElectionsBalance(this.state.coin, res.result)
        .then((res) => {
          if (res.msg === 'success') {
            this.setState({
              balance: res.result.balance,
            });
          }
        });

        shepherdElectionsTransactions(this.state.coin, res.result, this.state.userType)
        .then((res) => {
          this.setState({
            transactions: res.result,
          });
        });

        this.setState({
          isAuth: true,
          pub: res.result,
        });
      }
    });
  }

  componentWillReceiveProps(props) {
    if (props &&
        props.Main &&
        props.Main.displayNotaryElectionsModal &&
        !this.electionsDataInterval) {
      this.sync();
      this.electionsDataInterval = setInterval(() => {
        this.sync();
      }, ELECTIONS_SYNC_UPDATE_INTERVAL);
    } else {
      clearInterval(this.electionsDataInterval);
      this.electionsDataInterval = null;
    }
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  handleKeydown(e) {
    this.updateLoginPassPhraseInput(e);

    if (e.key === 'Enter') {
      this.loginSeed();
    }
  }

  setRegion(region) {
    this.setState({
      region,
    });
  }

  setUserType(type) {
    this.setState({
      userType: type,
    });
  }

  toggleSeedInputVisibility() {
    this.setState({
      seedInputVisibility: !this.state.seedInputVisibility,
    });

    this.resizeLoginTextarea();
  }

  resizeLoginTextarea() {
    // auto-size textarea
    setTimeout(() => {
      if (this.state.seedInputVisibility) {
        document.querySelector('#loginPassphrase').style.height = '1px';
        document.querySelector('#loginPassphrase').style.height = `${(15 + document.querySelector('#loginPassphrase').scrollHeight)}px`;
      }
    }, 100);
  }

  updateLoginPassPhraseInput(e) {
    // remove any empty chars from the start/end of the string
    const newValue = e.target.value;

    clearTimeout(this.state.trimPassphraseTimer);

    const _trimPassphraseTimer = setTimeout(() => {
      this.setState({
        loginPassphrase: newValue ? newValue.trim() : '', // hardcoded field name
      });
    }, 2000);

    this.resizeLoginTextarea();

    this.setState({
      trimPassphraseTimer: _trimPassphraseTimer,
      [e.target.name === 'loginPassphraseTextarea' ? 'loginPassphrase' : e.target.name]: newValue,
    });
  }

  loginSeed() {
    shepherdElectionsLogin(this.state.loginPassphrase, this.state.coin)
    .then((res) => {
      if (res.msg === 'success') {
        this.setState({
          isAuth: true,
          pub: res.result,
        });
      } else {
        Store.dispatch(
          triggerToaster(
            'loginSeed',
            'Error',
            'error'
          )
        );
      }
    });

    this.setState({
      loginPassphrase: '',
      loginPassPhraseSeedType: null,
    });

    // reset login input vals
    this.refs.loginPassphrase.value = '';
    this.refs.loginPassphraseTextarea.value = '';

    this.sync();
  }

  logout() {
    shepherdElectionsLogout()
    .then((res) => {
      this.setState(this.defaultState);
    });
  }

  closeModal() {
    clearInterval(this.electionsDataInterval);
    this.electionsDataInterval = null;
    Store.dispatch(toggleNotaryElectionsModal(false));
  }

  displayTxHistoryRender() {
    if (this.state.transactions &&
        this.state.transactions.length) {
      return true;
    }
  }

  renderHistoryRegion(region) {
    let _region;

    switch (region) {
      case 'ne2k18-sh':
        _region = 'SH';
        break;
      case 'ne2k18-na':
        _region = 'NA';
        break;
      case 'ne2k18-ae':
        _region = 'AE';
        break;
      case 'ne2k18-eu':
        _region = 'EU';
        break;
    }

    return _region;
  }

  renderHistory() {
    const _history = this.state.transactions;
    let _items = [];

    for (let i = 0; i < _history.length; i++) {
      _items.push(
        <tr key={ `notary-elections-history-${i}` }>
          <td>{ _history[i].address }</td>
          <td>{ Number(_history[i].amount) }</td>
          <td>{ this.renderHistoryRegion(_history[i].region) }</td>
          <td>{ secondsToString(_history[i].timestamp) }</td>
        </tr>
      );
    }

    return (
      <table className="table table-hover dataTable table-striped">
        <thead>
          <tr>
            <th>{ this.state.userType === 'voter' ? 'To' : 'From' }</th>
            <th>{ translate('INDEX.AMOUNT') }</th>
            <th>Region</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
        { _items }
        </tbody>
        <tfoot>
          <tr>
            <th>{ this.state.userType === 'voter' ? 'To' : 'From' }</th>
            <th>{ translate('INDEX.AMOUNT') }</th>
            <th>Region</th>
            <th>Time</th>
          </tr>
        </tfoot>
      </table>
    );
  }

  render() {
    if (this.props &&
        this.props.Main &&
        this.props.Main.displayNotaryElectionsModal) {
      return (
        <div>
          <div className="modal show notary-elections-modal ff">
            <div
              onClick={ this.closeModal }
              className="modal-close-overlay"></div>
            <div className="modal-dialog modal-center modal-lg">
              <div
                onClick={ this.closeModal }
                className="modal-close-overlay"></div>
              <div className="modal-content">
                <div className="modal-body modal-body-container">
                  <div className="modal-resizable">
                    <div className="elections-title-bar">
                      <img src={ `assets/images/native/kmd_header_title_logo.png` } />
                      <div className="elections-title">Notary Elections 2018</div>
                    </div>
                    { this.state.isAuth &&
                      <button
                        onClick={ this.logout }
                        className="btn btn-md btn-info btn-block ladda-button elections-logout-btn">
                        <i className="fa fa-power-off margin-right-5"></i>Logout
                      </button>
                    }
                    <div className="elections-user-type">
                      <a
                        className={ this.state.userType === 'voter' ? 'active' : '' }
                        onClick={ () => this.setUserType('voter') }><i className="fa fa-file margin-right-10"></i>I'm a voter</a>
                      <span className="margin-left-30 margin-right-30">|</span>
                      <a
                        className={ this.state.userType === 'candidate' ? 'active' : '' }
                        onClick={ () => this.setUserType('candidate') }><i className="fa fa-user margin-right-10"></i>I'm a candidate</a>
                    </div>
                    { !this.state.isAuth &&
                      <div className="elections-login">
                        <label
                          className="floating-label"
                          htmlFor="inputPassword">{ translate('INDEX.WALLET_SEED') }</label>
                        <input
                          type="password"
                          name="loginPassphrase"
                          ref="loginPassphrase"
                          className={ !this.state.seedInputVisibility ? 'form-control' : 'hide' }
                          onChange={ this.updateLoginPassPhraseInput }
                          onKeyDown={ (event) => this.handleKeydown(event) }
                          autoComplete="off"
                          value={ this.state.loginPassphrase || '' } />
                        <textarea
                          className={ this.state.seedInputVisibility ? 'form-control' : 'hide' }
                          id="loginPassphrase"
                          ref="loginPassphraseTextarea"
                          name="loginPassphraseTextarea"
                          autoComplete="off"
                          onChange={ this.updateLoginPassPhraseInput }
                          onKeyDown={ (event) => this.handleKeydown(event) }
                          value={ this.state.loginPassphrase || '' }></textarea>
                        <i
                          className={ 'seed-toggle fa fa-eye' + (!this.state.seedInputVisibility ? '-slash' : '') }
                          onClick={ this.toggleSeedInputVisibility }></i>
                        <button
                          onClick={ this.loginSeed }
                          disabled={ !this.state.loginPassphrase || !this.state.loginPassphrase.length }
                          className="btn btn-md btn-primary btn-block ladda-button elections-login-btn">
                          Login
                        </button>
                      </div>
                    }
                    { this.state.isAuth &&
                      !this.state.transactions &&
                      !this.state.balance &&
                      <Spinner />
                    }
                    { this.state.isAuth &&
                      this.state.userType === 'voter' &&
                      <div className="elections-voter-ui">
                        <div className="elections-map">
                          <img src={ `assets/images/world-map.png` } />
                          <div className={ 'elections-map-node elections-map-node--na' + (this.state.region === 'na' ? ' active' : '') }>
                            <label className="notary-elections-node-title">NA</label>
                            <img
                              onClick={ () => this.setRegion('na') }
                              src={ `assets/images/cryptologo/kmd.png` } />
                          </div>
                          <div className={ 'elections-map-node elections-map-node--sh' + (this.state.region === 'sh' ? ' active' : '') }>
                            <label className="notary-elections-node-title">SH</label>
                            <img
                              onClick={ () => this.setRegion('sh') }
                              src={ `assets/images/cryptologo/kmd.png` } />
                          </div>
                          <div className={ 'elections-map-node elections-map-node--ae' + (this.state.region === 'ae' ? ' active' : '') }>
                            <label className="notary-elections-node-title">AE</label>
                            <img
                              onClick={ () => this.setRegion('ae') }
                              src={ `assets/images/cryptologo/kmd.png` } />
                          </div>
                          <div className={ 'elections-map-node elections-map-node--eu' + (this.state.region === 'eu' ? ' active' : '') }>
                            <label className="notary-elections-node-title">EU</label>
                            <img
                              onClick={ () => this.setRegion('eu') }
                              src={ `assets/images/cryptologo/kmd.png` } />
                          </div>
                        </div>
                      </div>
                    }
                    { this.state.isAuth &&
                      <div className={ `elections-balance` + (this.state.userType === 'candidate' ? ' margin-top-25' : '') }>
                        You have <strong>{ this.state.balance }</strong> VOTE
                      </div>
                    }
                    { this.state.isAuth &&
                      this.state.userType === 'voter' &&
                      <div className="elections-send margin-top-10">
                        <input
                          type="text"
                          className="form-control block margin-bottom-10"
                          name="address"
                          value={ this.state.address !== 0 ? this.state.address : '' }
                          onChange={ this.updateInput }
                          placeholder="Enter an address"
                          autoComplete="off" />
                        <input
                          type="text"
                          className="form-control inline"
                          name="amount"
                          value={ this.state.amount !== 0 ? this.state.amount : '' }
                          onChange={ this.updateInput }
                          placeholder="Enter an amout, e.g. 1"
                          autoComplete="off" />
                        <button
                          onClick={ this.send }
                          disabled={ !this.state.amount || !this.state.address || !this.state.address.length || !this.state.region || this.state.address === this.state.pub }
                          className="btn btn-md btn-primary btn-block ladda-button elections-login-btn">
                          Vote
                        </button>
                      </div>
                    }
                    { this.displayTxHistoryRender() &&
                      <div>
                        <div className={ `elections-history`  + (this.state.userType === 'voter' ? ' margin-top-20' : '') }>
                          History
                        </div>
                        { this.renderHistory() }
                      </div>
                    }
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-default"
                    onClick={ this.closeModal }>{ translate('INDEX.CLOSE') }</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show in"></div>
        </div>
      );
    } else {
      return null;
    }
  }
}

const mapStateToProps = (state) => {
  return {
    Main: state.Main,
  };
};

export default connect(mapStateToProps)(NotaryElectionsModal);