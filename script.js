const ACTIVE = "active";
const IDLE = "idle";
const USER_STATE = "_userState";
const EXPIRED_TIME = "_expiredTime";
const TRACKER_EVENTS =  ["mousemove", "scroll", "keydown", "resize", "focus", "blur"];

function debounce(func, timeout = 300){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {func.apply(this, args)}, timeout);
  }
}

class IdleTimer{
  constructor({timeout, callback, intervalTime, refreshAfter}){
    this.timeout = timeout * 1000;
    this.callback = callback;
    this.intervalTime = intervalTime * 1000 || this.timeout / 10;
    console.log(this.timeout, refreshAfter * 1000);
    this.refreshAfter = (this.timeout - refreshAfter * 1000 || (this.timeout - (2 * this.intervalTime)))/1000;

    this.startInterval.apply(this);
    this.trackers();

    this._bc = new BroadcastChannel("agoda_idle_detector");
    this._br = new BroadcastChannel("agoda_idle_detector");
    this.broadCastInfo.apply(this);
  }

  init(){
    this.setUserState(ACTIVE);
    this.updateExpiredTime();
  }

  getUserState(){
    return localStorage.getItem(USER_STATE) === ACTIVE ? ACTIVE : IDLE;
  }

  setUserState(state){
    console.log("calling");
    localStorage.setItem(USER_STATE, state);
  }

  setUserStateActive(){
    this.setUserState(ACTIVE);
  }

  updateExpiredTime(){
    const newExpiryTime = Date.now() + this.timeout;
    localStorage.setItem(EXPIRED_TIME, newExpiryTime);
  }

  getExpiredTime(){
    return parseInt(localStorage.getItem(EXPIRED_TIME) || 0, 10);
  }

  getRemainingTimeInSeconds(){
    return Math.floor(new Date(this.getExpiredTime() - Date.now()).getTime()/1000);
  }

  startInterval(){
    this.init();

    this.startIntervalTimer = setInterval(()=> {
      if(this.getUserState() === ACTIVE && this.getRemainingTimeInSeconds() < this.refreshAfter){
        this.updateExpiredTime();
        this.setUserState(IDLE);
        this.callback("refresh", null);
      }else if(this.getExpiredTime() < Date.now()){
        this.cleanUp();
        this.callback(null, "logout");
      }
    }, this.intervalTime);
  }

  broadCastInfo(){
    this.broadCastInfoTimer = setInterval(()=> {
      if(!document.hidden){
        this._bc.postMessage({
          timeRemaining : this.getUserState() === IDLE ? this.getRemainingTimeInSeconds() : this.getRemainingTimeInSeconds() + this.timeout/1000,
          userState: this.getUserState()
        })
      }
    }, 1000)
  }

  trackers(){
    TRACKER_EVENTS.map(event => window.addEventListener(event, debounce(this.setUserStateActive.bind(this)), 5000));
  }

  clearAllIntervals(){
    clearInterval(this.startIntervalTimer);
    clearInterval(this.broadCastInfoTimer);
  }

  removeStorage(){
    localStorage.removeItem(USER_STATE);
    localStorage.removeItem(EXPIRED_TIME);
  }

  cleanUp(){
    TRACKER_EVENTS.map(event => window.removeEventListener(event, this.setUserStateActive.bind(this)));
    this.clearAllIntervals.apply(this)
    this.removeStorage();
    this._bc.close();
    this._br.close();
  }

}