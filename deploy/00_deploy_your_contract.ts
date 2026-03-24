import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, log } = deployments;

    const { deployer } = await getNamedAccounts();

    log("Deploying SafeExchangeEscrowSoftGuard...");

    const contract = await deploy("SafeExchangeEscrowSoftGuard", {
        // đổi tên theo contract của bạn
        from: deployer,
        args: [], // nếu constructor có tham số thì thêm vào đây
        log: true,
    });

    log(`MainContract deployed at: ${contract.address}`);
};

export default func;
func.tags = ["Main"];
