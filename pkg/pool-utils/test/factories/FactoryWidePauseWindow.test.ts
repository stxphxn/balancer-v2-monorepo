import { BigNumber, Contract } from 'ethers';
import { deploy } from '@balancer-labs/v2-helpers/src/contract';
import { expect } from 'chai';
import { advanceTime, currentTimestamp, DAY } from '@balancer-labs/v2-helpers/src/time';
import { bn } from '@balancer-labs/v2-helpers/src/numbers';

describe('FactoryWidePauseWindow', function () {
  let factory: Contract;
  let factoryDeployTime: BigNumber;

  const PAUSE_WINDOW_DURATION = DAY * 90;
  const BUFFER_PERIOD_DURATION = DAY * 30;

  context('with valid durations', () => {
    sharedBeforeEach(async () => {
      factory = await deploy('MockFactoryWidePauseWindow', { args: [PAUSE_WINDOW_DURATION, BUFFER_PERIOD_DURATION] });
      factoryDeployTime = await currentTimestamp();
    });

    context('before the pause window end time', () => {
      context('at the beginning of the pause window', () => {
        itReturnsANonZeroWindow();
      });

      context('after some time has passed', () => {
        sharedBeforeEach('advance some time', async () => {
          await advanceTime(PAUSE_WINDOW_DURATION / 3);
        });

        itReturnsANonZeroWindow();
      });
    });

    context('at the pause window end time', () => {
      sharedBeforeEach('move to pause window end time', async () => {
        await advanceTime(PAUSE_WINDOW_DURATION);
      });

      itReturnsAZeroWindow();
    });

    context('after the pause window end time', () => {
      sharedBeforeEach('advance time', async () => {
        await advanceTime(PAUSE_WINDOW_DURATION * 2);
      });

      itReturnsAZeroWindow();
    });

    function itReturnsANonZeroWindow() {
      it('returns the current pause window duration', async () => {
        const now = await currentTimestamp();
        const expectedDuration = bn(PAUSE_WINDOW_DURATION).sub(now.sub(factoryDeployTime));

        const { pauseWindowDuration } = await factory.getPauseConfiguration();
        expect(pauseWindowDuration).to.equal(expectedDuration);
      });

      it('returns the full buffer period duration', async () => {
        const { bufferPeriodDuration } = await factory.getPauseConfiguration();
        expect(bufferPeriodDuration).to.equal(BUFFER_PERIOD_DURATION);
      });
    }

    function itReturnsAZeroWindow() {
      it('returns a zero pause window duration', async () => {
        const { pauseWindowDuration } = await factory.getPauseConfiguration();
        expect(pauseWindowDuration).to.be.zero;
      });

      it('returns a zero buffer period duration', async () => {
        const { bufferPeriodDuration } = await factory.getPauseConfiguration();
        expect(bufferPeriodDuration).to.be.zero;
      });
    }
  });

  context('with invalid durations', () => {
    let maxPauseWindow: number;
    let maxBuffer: number;

    sharedBeforeEach(async () => {
      factory = await deploy('MockFactoryWidePauseWindow', { args: [PAUSE_WINDOW_DURATION, BUFFER_PERIOD_DURATION] });

      maxPauseWindow = await factory.getMaxPauseWindowDuration();
      maxBuffer = await factory.getMaxBufferPeriodDuration();
    });

    it('rejects a pause window duration above the max', async () => {
      await expect(
        deploy('MockFactoryWidePauseWindow', { args: [maxPauseWindow + 1, BUFFER_PERIOD_DURATION] })
      ).to.be.revertedWith('MAX_PAUSE_WINDOW_DURATION');
    });

    it('rejects a buffer duration above the max', async () => {
      await expect(
        deploy('MockFactoryWidePauseWindow', { args: [PAUSE_WINDOW_DURATION, maxBuffer + 1] })
      ).to.be.revertedWith('MAX_BUFFER_PERIOD_DURATION');
    });
  });
});
